-- Toegepast via Supabase MCP apply_migration (version 20260726103508) — dit bestand houdt de repo in sync.
--
-- Fase 1 (admin-dashboard herbouw): Operations + Growth samenvattingen krijgen een TIJDVENSTER en een
-- TEST-FILTER. Reden: elk getal was een optelsom sinds dag 1, zonder venster, inclusief testruns -> je kon
-- niet zien hoe het NU/deze week gaat. Nu: p_from/p_to (NULL = lifetime, backwards-compatible met de
-- Overview-pagina die zonder args aanroept) + p_exclude_internal (ops).
-- De "live-nu"-meters (in_flight, stuck, queue_depth_now) blijven realtime, los van het analysevenster.

DROP FUNCTION IF EXISTS public.admin_operations_summary();
CREATE FUNCTION public.admin_operations_summary(
  p_from             timestamptz DEFAULT NULL,
  p_to               timestamptz DEFAULT NULL,
  p_exclude_internal boolean     DEFAULT false
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_internal    uuid[];
  v_complete    integer; v_error integer; v_in_flight integer; v_stuck integer;
  v_error_types jsonb;   v_queue_now integer; v_queue_wait numeric; v_proc_avg numeric;
  v_total_win   integer; v_pl_total integer; v_pl_complete integer; v_pl_retry integer; v_watchdog integer;
BEGIN
  v_internal := ARRAY(SELECT id FROM public.profiles WHERE is_internal);

  SELECT
    count(*) FILTER (WHERE status='complete'),
    count(*) FILTER (WHERE status='error'),
    count(*) FILTER (WHERE watchdog_attempts > 0),
    count(*)
  INTO v_complete, v_error, v_watchdog, v_total_win
  FROM public.transcription_jobs tj
  WHERE (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT jsonb_object_agg(et, c) INTO v_error_types FROM (
    SELECT COALESCE(error_type,'uncategorized') et, count(*) c
    FROM public.transcription_jobs tj
    WHERE status='error'
      AND (p_from IS NULL OR tj.created_at >= p_from)
      AND (p_to   IS NULL OR tj.created_at <  p_to)
      AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)))
    GROUP BY 1) e;

  SELECT round(avg(EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1) INTO v_queue_wait
  FROM public.transcription_jobs tj
  WHERE started_at IS NOT NULL AND created_at IS NOT NULL
    AND (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT round(avg(processing_time_seconds)::numeric, 1) INTO v_proc_avg
  FROM public.transcription_jobs tj
  WHERE status='complete' AND processing_time_seconds IS NOT NULL
    AND (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND NOT (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes'))
  INTO v_in_flight, v_stuck, v_queue_now
  FROM public.transcription_jobs tj
  WHERE (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT count(*), count(*) FILTER (WHERE status='complete'), count(*) FILTER (WHERE is_retry)
  INTO v_pl_total, v_pl_complete, v_pl_retry
  FROM public.playlist_extraction_jobs pj
  WHERE (p_from IS NULL OR pj.created_at >= p_from)
    AND (p_to   IS NULL OR pj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (pj.user_id = ANY(v_internal)));

  RETURN jsonb_build_object(
    'jobs', jsonb_build_object(
      'total', v_total_win,
      'complete', v_complete, 'error', v_error, 'in_flight', v_in_flight, 'stuck', v_stuck),
    'success_rate', CASE WHEN (v_complete+v_error)>0 THEN round(v_complete::numeric/(v_complete+v_error),4) ELSE NULL END,
    'error_types', COALESCE(v_error_types,'{}'::jsonb),
    'retries', jsonb_build_object('playlist_retried', v_pl_retry, 'watchdog', v_watchdog),
    'capacity', jsonb_build_object('queue_depth_now', v_queue_now, 'avg_queue_wait_sec', v_queue_wait, 'avg_processing_sec', v_proc_avg),
    'playlist', jsonb_build_object('total', v_pl_total, 'complete', v_pl_complete),
    'window', jsonb_build_object('from', p_from, 'to', p_to, 'exclude_internal', p_exclude_internal)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_operations_summary(timestamptz,timestamptz,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_summary(timestamptz,timestamptz,boolean) TO service_role;

-- GROWTH: cohort op aanmelddatum (profiles.created_at); funnel binnen die cohort. NULL = lifetime.
DROP FUNCTION IF EXISTS public.admin_growth_summary();
CREATE FUNCTION public.admin_growth_summary(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  users       uuid[];
  v_total     integer := 0; v_activated integer := 0; v_paying integer := 0; v_repeat integer := 0;
  v_ltv_total numeric := 0;  v_by_source jsonb; v_by_utm jsonb;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles
  WHERE NOT is_internal
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to   IS NULL OR created_at <  p_to);
  v_total := COALESCE(array_length(users, 1), 0);

  SELECT jsonb_object_agg(src, c) INTO v_by_source FROM (
    SELECT COALESCE(signup_source,'direct') AS src, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) a;
  SELECT jsonb_object_agg(u, c) INTO v_by_utm FROM (
    SELECT COALESCE(utm_source,'none') AS u, count(*) c
    FROM public.profiles WHERE id = ANY(users) GROUP BY 1) b;

  SELECT count(DISTINCT ct.user_id) INTO v_activated
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users);

  SELECT count(DISTINCT user_id), COALESCE(sum(paid),0) INTO v_paying, v_ltv_total FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.user_id, COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at) p;

  SELECT count(*) INTO v_repeat FROM (
    SELECT ct.user_id
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    GROUP BY ct.user_id
    HAVING count(DISTINCT ct.metadata->>'stripe_session_id') >= 2) r;

  RETURN jsonb_build_object(
    'external_total', v_total,
    'acquisition', jsonb_build_object(
      'by_source', COALESCE(v_by_source,'{}'::jsonb),
      'by_utm', COALESCE(v_by_utm,'{}'::jsonb),
      'cac', NULL),
    'activation', jsonb_build_object(
      'activated', v_activated,
      'rate', CASE WHEN v_total>0 THEN round(v_activated::numeric/v_total,4) ELSE NULL END),
    'monetization', jsonb_build_object(
      'paying', v_paying,
      'conversion', CASE WHEN v_total>0 THEN round(v_paying::numeric/v_total,4) ELSE NULL END,
      'ltv_total', round(v_ltv_total,2),
      'ltv_avg', CASE WHEN v_paying>0 THEN round(v_ltv_total/v_paying,2) ELSE NULL END),
    'retention', jsonb_build_object(
      'repeat_buyers', v_repeat,
      'repeat_rate', CASE WHEN v_paying>0 THEN round(v_repeat::numeric/v_paying,4) ELSE NULL END),
    'window', jsonb_build_object('from', p_from, 'to', p_to)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_growth_summary(timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_summary(timestamptz,timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
