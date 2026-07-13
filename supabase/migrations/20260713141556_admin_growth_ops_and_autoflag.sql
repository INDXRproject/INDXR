-- Admin control-center herontwerp: auto-flag interne test-accounts + Growth/Operations RPCs.
-- Presentatie-laag; geen wijziging aan de geld-logica. Alle admin-RPC's: SECURITY DEFINER,
-- REVOKE anon+authenticated (Supabase auto-grant, zie LESSONS 2026-07-13), GRANT service_role.

-- 1) AUTO-FLAG: nieuwe accounts met een test-patroon-email → is_internal=true bij profielaanmaak.
--    Vangt @indxr-test.com én elk +test-adres (+test, +test1, ...). handle_new_user() maakt de
--    profielrij aan ná auth.users-insert, dus de e-mail is opzoekbaar in deze BEFORE INSERT.
CREATE OR REPLACE FUNCTION public.flag_internal_test_account()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NOT NULL AND (v_email ILIKE '%@indxr-test.com' OR v_email ILIKE '%+test%') THEN
    NEW.is_internal := true;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_flag_internal_test ON public.profiles;
CREATE TRIGGER trg_flag_internal_test
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.flag_internal_test_account();

-- 2) GROWTH: acquisitie → activatie → monetisatie → retentie. Externe (echte) users only.
CREATE OR REPLACE FUNCTION public.admin_growth_summary()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  users            uuid[];
  v_total          integer := 0;
  v_activated      integer := 0;
  v_paying         integer := 0;
  v_repeat         integer := 0;
  v_ltv_total      numeric := 0;
  v_by_source      jsonb;
  v_by_utm         jsonb;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles WHERE NOT is_internal;
  v_total := array_length(users, 1);
  v_total := COALESCE(v_total, 0);

  -- Acquisitie: signups per bron / utm.
  SELECT jsonb_object_agg(src, c) INTO v_by_source FROM (
    SELECT COALESCE(signup_source, 'direct') AS src, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) a;
  SELECT jsonb_object_agg(u, c) INTO v_by_utm FROM (
    SELECT COALESCE(utm_source, 'none') AS u, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) b;

  -- Activatie: users die betaald verbruik hadden (eerste besteding van credits, product_type gestempeld).
  SELECT count(DISTINCT ct.user_id) INTO v_activated
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users);

  -- Monetisatie: betalende users (>=1 Stripe-aankoop) + LTV (som aankopen, dedup sessie).
  SELECT count(DISTINCT user_id), COALESCE(sum(paid),0) INTO v_paying, v_ltv_total FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.user_id, COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at) p;

  -- Retentie: users met >=2 aankoop-sessies (herhaalkoop).
  SELECT count(*) INTO v_repeat FROM (
    SELECT ct.user_id
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    GROUP BY ct.user_id
    HAVING count(DISTINCT ct.metadata->>'stripe_session_id') >= 2) r;

  RETURN jsonb_build_object(
    'external_total', v_total,
    'acquisition', jsonb_build_object(
      'by_source', COALESCE(v_by_source, '{}'::jsonb),
      'by_utm', COALESCE(v_by_utm, '{}'::jsonb),
      'cac', NULL),  -- CAC = opex_expenses(ads) / nieuwe betalende users; NULL tot ads draaien
    'activation', jsonb_build_object(
      'activated', v_activated,
      'rate', CASE WHEN v_total > 0 THEN round(v_activated::numeric / v_total, 4) ELSE NULL END),
    'monetization', jsonb_build_object(
      'paying', v_paying,
      'conversion', CASE WHEN v_total > 0 THEN round(v_paying::numeric / v_total, 4) ELSE NULL END,
      'ltv_total', round(v_ltv_total, 2),
      'ltv_avg', CASE WHEN v_paying > 0 THEN round(v_ltv_total / v_paying, 2) ELSE NULL END),
    'retention', jsonb_build_object(
      'repeat_buyers', v_repeat,
      'repeat_rate', CASE WHEN v_paying > 0 THEN round(v_repeat::numeric / v_paying, 4) ELSE NULL END)
  );
END;
$function$;

-- 3) OPERATIONS: systeem-gezondheid over ALLE jobs (niet economie-gefilterd).
CREATE OR REPLACE FUNCTION public.admin_operations_summary()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_complete    integer := 0;
  v_error       integer := 0;
  v_in_flight   integer := 0;
  v_error_types jsonb;
  v_queue_now   integer := 0;
  v_queue_wait  numeric;
  v_proc_avg    numeric;
  v_pl_total    integer := 0;
  v_pl_complete integer := 0;
  v_pl_retry    integer := 0;
  v_watchdog    integer := 0;
BEGIN
  SELECT
    count(*) FILTER (WHERE status='complete'),
    count(*) FILTER (WHERE status='error'),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')),
    count(*) FILTER (WHERE watchdog_attempts > 0)
  INTO v_complete, v_error, v_in_flight, v_watchdog
  FROM public.transcription_jobs;

  SELECT jsonb_object_agg(et, c) INTO v_error_types FROM (
    SELECT COALESCE(error_type, 'uncategorized') AS et, count(*) c
    FROM public.transcription_jobs WHERE status='error' GROUP BY 1) e;

  -- Capaciteit: huidige wachtrij + gemiddelde wachttijd + gemiddelde verwerkingstijd.
  SELECT count(*) INTO v_queue_now FROM public.transcription_jobs
   WHERE status IN ('pending','downloading');
  SELECT round(avg(EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1) INTO v_queue_wait
   FROM public.transcription_jobs WHERE started_at IS NOT NULL AND created_at IS NOT NULL;
  SELECT round(avg(processing_time_seconds)::numeric, 1) INTO v_proc_avg
   FROM public.transcription_jobs WHERE status='complete' AND processing_time_seconds IS NOT NULL;

  SELECT count(*), count(*) FILTER (WHERE status='complete'), count(*) FILTER (WHERE is_retry)
  INTO v_pl_total, v_pl_complete, v_pl_retry FROM public.playlist_extraction_jobs;

  RETURN jsonb_build_object(
    'jobs', jsonb_build_object(
      'total', v_complete + v_error + v_in_flight,
      'complete', v_complete, 'error', v_error, 'in_flight', v_in_flight),
    'success_rate', CASE WHEN (v_complete + v_error) > 0
                         THEN round(v_complete::numeric / (v_complete + v_error), 4) ELSE NULL END,
    'error_types', COALESCE(v_error_types, '{}'::jsonb),
    'retries', jsonb_build_object('playlist_retried', v_pl_retry, 'watchdog', v_watchdog),
    'capacity', jsonb_build_object(
      'queue_depth_now', v_queue_now,
      'avg_queue_wait_sec', v_queue_wait,
      'avg_processing_sec', v_proc_avg),
    'playlist', jsonb_build_object('total', v_pl_total, 'complete', v_pl_complete)
  );
END;
$function$;

-- ACL (financieel/data-kritiek): geen anon/authenticated toegang.
REVOKE ALL ON FUNCTION public.admin_growth_summary()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_operations_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_summary()     TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_operations_summary() TO service_role;
