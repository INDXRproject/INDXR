-- F17: service balances/usage + Decodo reconciliation.
--   1. DeepSeek balance (Operations, nightly) — prepaid, low-balance alert (threshold in cost_config).
--   2. Decodo reconciliation (Finance, nightly) — billed (Decodo API) vs measured (F18) = gap, an OPEX line.
--   AssemblyAI: no balance/usage API (PAYG + auto-recharge) — nothing to fetch (documented in provenance).
--
-- Forward-only: tables start empty; a period without fetched Decodo data reads 'unavailable', never a
-- fabricated 100% gap. A failed fetch keeps the last-good balance + last_success_at (never $0, never silent).

-- Per-service alert threshold (only DeepSeek has an alert-worthy balance; no empty slots for the others).
ALTER TABLE public.cost_config ADD COLUMN IF NOT EXISTS deepseek_low_balance_usd numeric NOT NULL DEFAULT 5;

-- Fetch status + latest balance per external service. Balance only meaningful for deepseek.
CREATE TABLE IF NOT EXISTS public.service_metrics (
  service         text PRIMARY KEY,          -- 'deepseek' | 'decodo'
  balance         numeric,                   -- last known balance (deepseek); NULL for decodo
  currency        text,                      -- 'USD' etc.
  last_success_at timestamptz,               -- last SUCCESSFUL fetch (drives "unavailable + last ok")
  last_attempt_at timestamptz,               -- last attempt (success or fail)
  last_error      text                       -- error of the last failed attempt (NULL after a success)
);
ALTER TABLE public.service_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_metrics FROM anon, authenticated;
GRANT ALL ON public.service_metrics TO service_role;

-- Decodo billed traffic per day (rx+tx bytes → the account-level truth). Forward-only, upserted nightly.
CREATE TABLE IF NOT EXISTS public.decodo_daily_usage (
  day         date PRIMARY KEY,
  rx_bytes    bigint NOT NULL DEFAULT 0,
  tx_bytes    bigint NOT NULL DEFAULT 0,
  billed_bytes bigint NOT NULL DEFAULT 0,    -- rx+tx (residential proxy billing counts both directions)
  fetched_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decodo_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.decodo_daily_usage FROM anon, authenticated;
GRANT ALL ON public.decodo_daily_usage TO service_role;

-- record_service_fetch: on success set balance/currency + last_success_at=now (clear error); on failure set
-- ONLY last_attempt_at + last_error, KEEPING the last-good balance and last_success_at. Backend-only.
CREATE OR REPLACE FUNCTION public.record_service_fetch(
  p_service text, p_ok boolean, p_balance numeric DEFAULT NULL, p_currency text DEFAULT NULL, p_error text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_ok THEN
    INSERT INTO public.service_metrics (service, balance, currency, last_success_at, last_attempt_at, last_error)
    VALUES (p_service, p_balance, p_currency, now(), now(), NULL)
    ON CONFLICT (service) DO UPDATE SET
      balance = EXCLUDED.balance, currency = EXCLUDED.currency,
      last_success_at = now(), last_attempt_at = now(), last_error = NULL;
  ELSE
    INSERT INTO public.service_metrics (service, last_attempt_at, last_error)
    VALUES (p_service, now(), p_error)
    ON CONFLICT (service) DO UPDATE SET
      last_attempt_at = now(), last_error = p_error;   -- balance/currency/last_success_at untouched
  END IF;
END;
$function$;
-- REVOKE FROM PUBLIC too — a SECURITY DEFINER function is granted EXECUTE to PUBLIC by default, so
-- FROM anon,authenticated alone leaves it callable via /rest/v1/rpc (LESSONS 2026-07-13).
REVOKE EXECUTE ON FUNCTION public.record_service_fetch(text,boolean,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_service_fetch(text,boolean,numeric,text,text) TO service_role;

-- admin_operations_summary: add a `services` block for the DeepSeek low-balance alert.
CREATE OR REPLACE FUNCTION public.admin_operations_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_complete    integer := 0;
  v_error       integer := 0;
  v_in_flight   integer := 0;
  v_stuck       integer := 0;
  v_error_types jsonb;
  v_queue_now   integer := 0;
  v_queue_wait  numeric;
  v_proc_avg    numeric;
  v_pl_total    integer := 0;
  v_pl_complete integer := 0;
  v_pl_retry    integer := 0;
  v_watchdog    integer := 0;
  v_ds_bal numeric; v_ds_cur text; v_ds_ok timestamptz; v_ds_att timestamptz; v_ds_err text;
  v_ds_thr numeric; v_ds_status text;
BEGIN
  SELECT
    count(*) FILTER (WHERE status='complete'),
    count(*) FILTER (WHERE status='error'),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND (created_at > now() - interval '30 minutes'
           OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND NOT (created_at > now() - interval '30 minutes'
           OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes')),
    count(*) FILTER (WHERE watchdog_attempts > 0)
  INTO v_complete, v_error, v_in_flight, v_stuck, v_watchdog
  FROM public.transcription_jobs;

  SELECT jsonb_object_agg(et, c) INTO v_error_types FROM (
    SELECT COALESCE(error_type, 'uncategorized') AS et, count(*) c
    FROM public.transcription_jobs WHERE status='error' GROUP BY 1) e;

  SELECT count(*) INTO v_queue_now FROM public.transcription_jobs
   WHERE status IN ('pending','downloading')
     AND (created_at > now() - interval '30 minutes'
          OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes');
  SELECT round(avg(EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1) INTO v_queue_wait
   FROM public.transcription_jobs WHERE started_at IS NOT NULL AND created_at IS NOT NULL;
  SELECT round(avg(processing_time_seconds)::numeric, 1) INTO v_proc_avg
   FROM public.transcription_jobs WHERE status='complete' AND processing_time_seconds IS NOT NULL;

  SELECT count(*), count(*) FILTER (WHERE status='complete'), count(*) FILTER (WHERE is_retry)
  INTO v_pl_total, v_pl_complete, v_pl_retry FROM public.playlist_extraction_jobs;

  -- F17: DeepSeek prepaid balance + low-balance alert. 'unavailable' when never fetched OR the latest
  -- attempt failed (last_attempt_at > last_success_at) → UI shows last_success_at, not a stale number.
  SELECT balance, currency, last_success_at, last_attempt_at, last_error
    INTO v_ds_bal, v_ds_cur, v_ds_ok, v_ds_att, v_ds_err FROM public.service_metrics WHERE service='deepseek';
  SELECT deepseek_low_balance_usd INTO v_ds_thr FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  v_ds_status := CASE
    WHEN v_ds_ok IS NULL THEN 'unavailable'
    WHEN v_ds_att IS NOT NULL AND v_ds_att > v_ds_ok THEN 'unavailable'
    WHEN v_ds_bal IS NOT NULL AND v_ds_bal < COALESCE(v_ds_thr,5) THEN 'low'
    ELSE 'ok' END;

  RETURN jsonb_build_object(
    'jobs', jsonb_build_object(
      'total', v_complete + v_error + v_in_flight + v_stuck,
      'complete', v_complete, 'error', v_error, 'in_flight', v_in_flight, 'stuck', v_stuck),
    'success_rate', CASE WHEN (v_complete + v_error) > 0
                         THEN round(v_complete::numeric / (v_complete + v_error), 4) ELSE NULL END,
    'error_types', COALESCE(v_error_types, '{}'::jsonb),
    'retries', jsonb_build_object('playlist_retried', v_pl_retry, 'watchdog', v_watchdog),
    'capacity', jsonb_build_object(
      'queue_depth_now', v_queue_now,
      'avg_queue_wait_sec', v_queue_wait,
      'avg_processing_sec', v_proc_avg),
    'playlist', jsonb_build_object('total', v_pl_total, 'complete', v_pl_complete),
    'services', jsonb_build_object('deepseek', jsonb_build_object(
      'balance', v_ds_bal, 'currency', v_ds_cur, 'threshold', COALESCE(v_ds_thr,5), 'status', v_ds_status,
      'last_success_at', v_ds_ok, 'last_error', v_ds_err))
  );
END;
$function$;

-- admin_finance_summary: add the Decodo reconciliation OPEX line (external scope). billed (Decodo API)
-- vs measured (all our proxy bytes, F18) = gap; the positive gap is the uncounted real cost → booked in
-- external net (like funnel_anon, the unattributable remainder lands in the real economy). Live-overlay
-- (not frozen in the snapshot — Decodo data arrives async). Shows 'unavailable' when no data fetched.
CREATE OR REPLACE FUNCTION public.admin_finance_summary(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg public.cost_config%ROWTYPE; v_scope text; v_internal boolean; rec jsonb; blocks jsonb := '{}'::jsonb;
  v_from_d date; v_to_d date; v_days_win numeric; v_days_month numeric; v_defer_win integer;
  v_cash numeric; v_vat numeric; v_revdel numeric; v_defbal numeric;
  v_cor_ai numeric; v_cor_cap numeric; v_cor_sum numeric; v_cor_rag numeric; v_cor_sto numeric;
  v_cor_meas_total numeric; v_cor_rev numeric; v_good numeric; v_fun_ll numeric; v_fun_an numeric;
  v_fun_an_bytes numeric := 0;
  v_proxy_fail_bytes numeric := 0; v_proxy_global_bytes numeric := 0; v_proxy_oh_bytes numeric := 0;
  v_proxy_oh numeric := 0; v_proxy_by_cat jsonb := '{}'::jsonb;
  v_measured_bytes numeric := 0; v_billed_bytes numeric := 0; v_cov_days integer := 0;
  v_recon_gap_bytes numeric := 0; v_recon_gap_cost numeric := 0; v_recon_status text := 'unavailable';
  v_decodo_ok timestamptz; v_decodo_err text; v_recon jsonb;
  v_fee numeric; v_charged numeric; v_net_settle numeric; v_vat_computed boolean;
  v_rec_fee numeric; v_def_fee numeric; v_purch_fee numeric;
  v_gross numeric; v_opex_meas numeric; v_net numeric; v_stor_bytes numeric; v_stor_gb numeric;
  v_storage_approx boolean;
  v_ai_hit_cr numeric; v_ai_miss_cr numeric; v_ai_hit_n integer; v_ai_n integer; v_ai_saved numeric;
  v_cap_hit_n integer; v_cap_n integer; v_cap_avg_miss numeric; v_cap_saved numeric;
  v_defer_credits numeric; v_recent jsonb; v_recent_cor numeric; v_recent_cons numeric; v_avg_cpc numeric; v_est_future_cost numeric;
  v_est_sufficient boolean;
  v_entered jsonb; v_entered_total numeric; v_fee_by_type jsonb; v_pay_methods jsonb; v_vat_buckets jsonb;
  v_scr_succ integer; v_scr_succ_bill integer; v_scr_fail integer; v_scr_fail_bill integer;
  v_scr_block integer; v_scr_decl integer; v_radar_screens integer; v_radar_billable integer; v_radar_fee numeric;
  v_radar jsonb;
  v_eu text[] := ARRAY['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','EL','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  v_from_d := (p_from AT TIME ZONE 'Europe/Amsterdam')::date;
  v_to_d   := (p_to   AT TIME ZONE 'Europe/Amsterdam')::date;
  v_days_win := GREATEST(1, (v_to_d - v_from_d));
  v_days_month := EXTRACT(DAY FROM (date_trunc('month', p_to::timestamp) + interval '1 month - 1 day'));
  SELECT COALESCE((value)::text::integer, 90) INTO v_defer_win FROM public.finance_settings WHERE key='deferred_window_days';
  v_defer_win := COALESCE(v_defer_win, 90);
  v_entered := public.opex_accrual(v_from_d, v_to_d);
  v_entered_total := COALESCE((v_entered->>'total')::numeric, 0);

  -- F17 Decodo reconciliation (account-level, scope-independent). Measured = ALL our proxy bytes across
  -- both scopes (Decodo bills one account; test+prod share one proxy user → not splittable). Billed = the
  -- Decodo API daily rows in range. Only compute a gap when data was actually fetched (else 'unavailable').
  SELECT
    COALESCE((SELECT sum(proxy_bytes) FROM public.transcription_jobs WHERE created_at >= p_from AND created_at < p_to),0)
  + COALESCE((SELECT sum(proxy_bytes) FROM public.usage_logs WHERE extraction_type='caption' AND success AND created_at >= p_from AND created_at < p_to),0)
  + COALESCE((SELECT sum(caption_proxy_bytes) FROM public.daily_cost_counters WHERE day >= v_from_d AND day < v_to_d),0)
  + COALESCE((SELECT sum(bytes) FROM public.proxy_usage_log WHERE occurred_at >= p_from AND occurred_at < p_to),0)
  INTO v_measured_bytes;

  SELECT COALESCE(sum(billed_bytes),0), count(*) INTO v_billed_bytes, v_cov_days
  FROM public.decodo_daily_usage WHERE day >= v_from_d AND day < v_to_d;
  SELECT last_success_at, last_error INTO v_decodo_ok, v_decodo_err FROM public.service_metrics WHERE service='decodo';

  IF v_cov_days = 0 THEN
    v_recon_status := 'unavailable'; v_recon_gap_bytes := 0; v_recon_gap_cost := 0;
  ELSE
    v_recon_gap_bytes := v_billed_bytes - v_measured_bytes;
    -- Book only a POSITIVE gap (Decodo billed more than we counted = genuinely uncounted cost). A negative
    -- gap (we measured decompressed bodies > Decodo's wire bytes) is shown but not clawed back.
    v_recon_gap_cost := GREATEST(0, v_recon_gap_bytes)/1e9 * cfg.decodo_eur_per_gb;
    v_recon_status := CASE WHEN v_cov_days < v_days_win THEN 'partial' ELSE 'ok' END;
  END IF;

  FOR v_scope, v_internal IN SELECT s, i FROM (VALUES ('external', false), ('internal', true)) AS t(s, i) LOOP
    rec := public._geld_scope(v_internal, p_from, p_to);
    v_cash    := (rec->>'cash_in_gross')::numeric;
    v_vat     := (rec->>'vat')::numeric;
    v_vat_computed := (rec->>'vat_measured_all')::boolean;
    v_revdel  := (rec->>'recognized_revenue')::numeric;
    v_defbal  := (rec->>'deferred_revenue')::numeric;
    v_cor_ai  := (rec#>>'{cor,ai_transcription}')::numeric;
    v_cor_cap := (rec#>>'{cor,caption}')::numeric;
    v_cor_sum := (rec#>>'{cor,ai_summary}')::numeric;
    v_cor_rag := (rec#>>'{cor,rag}')::numeric;
    v_cor_rev := (rec->>'cor_against_revenue')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric;
    v_cor_sto := (rec#>>'{cor,storage}')::numeric;
    v_stor_bytes := (rec->>'storage_bytes')::numeric;
    v_storage_approx := (rec->>'storage_approx')::boolean;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_rec_fee := (rec->>'recognized_fee')::numeric;
    v_def_fee := (rec->>'deferred_fee')::numeric;
    v_purch_fee := (rec->>'purchased_fee')::numeric;
    v_defer_credits := (rec->>'deferred_credits')::numeric;
    v_proxy_fail_bytes := COALESCE((rec->>'proxy_fail_bytes')::numeric, 0);

    SELECT COALESCE(jsonb_object_agg(bucket, obj), '{}'::jsonb) INTO v_vat_buckets FROM (
      SELECT bucket, jsonb_build_object('vat', round(sum(vat),2), 'gross', round(sum(gross),2), 'count', sum(cnt)) AS obj
      FROM (
        SELECT CASE WHEN key = 'NL' THEN 'nl'
                    WHEN key = '??' THEN 'unknown'
                    WHEN key = ANY(v_eu) THEN 'oss'
                    ELSE 'outside' END AS bucket,
               COALESCE((value->>'vat')::numeric,0) AS vat,
               COALESCE((value->>'gross')::numeric,0) AS gross,
               COALESCE((value->>'count')::int,0) AS cnt
        FROM jsonb_each(rec->'vat_by_country')
      ) c GROUP BY bucket
    ) z;

    SELECT COALESCE(sum(fee),0), COALESCE(sum(net),0), COALESCE(sum(gross),0)
      INTO v_fee, v_net_settle, v_charged
    FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
        COALESCE((ct.metadata->>'stripe_fee')::numeric,0) AS fee,
        COALESCE((ct.metadata->>'net_settlement')::numeric,0) AS net,
        COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross
      FROM public.credit_transactions ct
      JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= p_from AND ct.created_at < p_to
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s;

    SELECT COALESCE(jsonb_object_agg(t, a), '{}'::jsonb) INTO v_fee_by_type FROM (
      SELECT fd->>'type' AS t, round(sum((fd->>'amount')::numeric),2) AS a
      FROM (
        SELECT DISTINCT ON (ct.metadata->>'stripe_session_id') ct.metadata AS m
        FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
        WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= p_from AND ct.created_at < p_to
        ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
      ) d CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d.m->'fee_details','[]'::jsonb)) fd
      GROUP BY 1
    ) x;

    SELECT COALESCE(jsonb_agg(DISTINCT pm), '[]'::jsonb) INTO v_pay_methods FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id') NULLIF(ct.metadata->>'payment_method','') AS pm
      FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= p_from AND ct.created_at < p_to
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) y WHERE pm IS NOT NULL;

    IF v_internal = false THEN
      SELECT COALESCE(sum(caption_proxy_bytes),0) INTO v_fun_an_bytes FROM public.daily_cost_counters WHERE day >= v_from_d AND day < v_to_d;
      v_fun_an := (v_fun_an_bytes/1e9) * cfg.decodo_eur_per_gb;

      SELECT COALESCE(sum(bytes),0) INTO v_proxy_global_bytes
      FROM public.proxy_usage_log WHERE occurred_at >= p_from AND occurred_at < p_to;
      SELECT COALESCE(jsonb_object_agg(category, b), '{}'::jsonb) INTO v_proxy_by_cat FROM (
        SELECT category, sum(bytes) AS b FROM public.proxy_usage_log
        WHERE occurred_at >= p_from AND occurred_at < p_to GROUP BY category
      ) q;

      SELECT count(DISTINCT ct.metadata->>'stripe_session_id'),
             count(DISTINCT ct.metadata->>'stripe_session_id') FILTER (WHERE ct.created_at >= cfg.radar_free_until::timestamptz)
        INTO v_scr_succ, v_scr_succ_bill
      FROM public.credit_transactions ct
      JOIN public.profiles pr ON pr.id = ct.user_id AND NOT pr.is_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= p_from AND ct.created_at < p_to;
      SELECT count(*) FILTER (WHERE screened),
             count(*) FILTER (WHERE screened AND occurred_at >= cfg.radar_free_until::timestamptz),
             count(*) FILTER (WHERE screened AND outcome_type='blocked'),
             count(*) FILTER (WHERE screened AND outcome_type IS DISTINCT FROM 'blocked')
        INTO v_scr_fail, v_scr_fail_bill, v_scr_block, v_scr_decl
      FROM public.payment_attempts pa
      LEFT JOIN public.profiles pr ON pr.id = pa.user_id
      WHERE NOT COALESCE(pr.is_internal, false) AND pa.occurred_at >= p_from AND pa.occurred_at < p_to;

      v_scr_succ := COALESCE(v_scr_succ,0); v_scr_succ_bill := COALESCE(v_scr_succ_bill,0);
      v_scr_fail := COALESCE(v_scr_fail,0); v_scr_fail_bill := COALESCE(v_scr_fail_bill,0);
      v_scr_block := COALESCE(v_scr_block,0); v_scr_decl := COALESCE(v_scr_decl,0);
      v_radar_screens := v_scr_succ + v_scr_fail;
      v_radar_billable := v_scr_succ_bill + v_scr_fail_bill;
      v_radar_fee := v_radar_billable * COALESCE(cfg.radar_eur_per_screen,0);
      v_radar := jsonb_build_object('screens', v_radar_screens, 'billable', v_radar_billable,
        'successful', v_scr_succ, 'declined', v_scr_decl, 'blocked', v_scr_block,
        'rate', COALESCE(cfg.radar_eur_per_screen,0), 'free_until', cfg.radar_free_until, 'fee', round(v_radar_fee,2));
    ELSE
      v_fun_an := 0;
      v_fun_an_bytes := 0;
      v_proxy_global_bytes := 0;
      v_proxy_by_cat := '{}'::jsonb;
      v_radar_fee := 0;
      v_radar := jsonb_build_object('screens', 0, 'billable', 0, 'successful', 0, 'declined', 0, 'blocked', 0,
        'rate', COALESCE(cfg.radar_eur_per_screen,0), 'free_until', cfg.radar_free_until, 'fee', 0);
    END IF;

    v_proxy_oh_bytes := v_proxy_fail_bytes + v_proxy_global_bytes;
    v_proxy_oh := (v_proxy_oh_bytes/1e9) * cfg.decodo_eur_per_gb;

    -- F17: reconciliation gap counts in the EXTERNAL P&L only (account-level truth → real economy).
    IF v_internal = false THEN
      v_recon := jsonb_build_object('billed_bytes', v_billed_bytes, 'measured_bytes', v_measured_bytes,
        'gap_bytes', v_recon_gap_bytes, 'gap_cost', round(v_recon_gap_cost,4),
        'coverage_days', v_cov_days, 'period_days', v_days_win, 'status', v_recon_status,
        'last_success_at', v_decodo_ok, 'last_error', v_decodo_err);
    ELSE
      v_recon := jsonb_build_object('status', 'not_applicable');
    END IF;

    v_cor_meas_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag + v_cor_sto;
    v_gross := v_revdel - v_cor_rev;
    v_opex_meas := v_good + v_fun_ll + v_fun_an + v_radar_fee + v_proxy_oh
                 + (CASE WHEN v_internal=false THEN v_recon_gap_cost ELSE 0 END);
    v_net := v_gross - v_opex_meas - (CASE WHEN v_internal=false THEN v_entered_total ELSE 0 END);

    SELECT COALESCE(sum(credits_cost) FILTER (WHERE cache_hit),0), COALESCE(sum(credits_cost) FILTER (WHERE NOT cache_hit),0),
           count(*) FILTER (WHERE cache_hit), count(*) INTO v_ai_hit_cr, v_ai_miss_cr, v_ai_hit_n, v_ai_n
    FROM public.transcription_jobs tj JOIN public.profiles p ON p.id=tj.user_id AND p.is_internal=v_internal
    WHERE tj.status='complete' AND tj.created_at >= p_from AND tj.created_at < p_to;
    v_ai_saved := CASE WHEN v_ai_miss_cr > 0 THEN v_ai_hit_cr * (v_cor_ai / v_ai_miss_cr) ELSE 0 END;

    SELECT count(*) FILTER (WHERE cache_hit), count(*), COALESCE(avg(proxy_bytes) FILTER (WHERE NOT cache_hit AND proxy_bytes>0),0)
      INTO v_cap_hit_n, v_cap_n, v_cap_avg_miss
    FROM public.usage_logs WHERE extraction_type='caption' AND success AND is_internal_at_time=v_internal AND created_at >= p_from AND created_at < p_to;
    v_cap_saved := (v_cap_hit_n * v_cap_avg_miss / 1e9) * cfg.decodo_eur_per_gb;

    v_recent := public._geld_scope(v_internal, p_to - make_interval(days => v_defer_win), p_to);
    v_recent_cor := (v_recent#>>'{cor,total}')::numeric; v_recent_cons := (v_recent->>'consumed_cr')::numeric;
    IF v_defer_credits = 0 THEN
      v_avg_cpc := 0; v_est_future_cost := 0; v_est_sufficient := true;
    ELSIF v_recent_cons > 0 THEN
      v_avg_cpc := v_recent_cor / v_recent_cons;
      v_est_future_cost := v_defer_credits * v_avg_cpc;
      v_est_sufficient := true;
    ELSE
      v_avg_cpc := NULL; v_est_future_cost := NULL; v_est_sufficient := false;
    END IF;

    blocks := jsonb_set(blocks, ARRAY[v_scope], jsonb_build_object(
      'cash_in', round(v_cash,2), 'vat', round(v_vat,2), 'vat_computed', v_vat_computed,
      'vat_unmeasured', jsonb_build_object('count', (rec->>'vat_unmeasured_count')::integer, 'gross', (rec->>'vat_unmeasured_gross')::numeric),
      'vat_by_country', rec->'vat_by_country', 'vat_buckets', v_vat_buckets,
      'revenue_delivered', round(v_revdel,2), 'deferred_balance', round(v_defbal,2),
      'credits_sold', (rec->>'purchased_cr')::numeric, 'credits_consumed', (rec->>'consumed_cr')::numeric,
      'consumed_by_type', rec->'consumed_by_type', 'purchased_share', (rec->>'purchased_share')::numeric, 'balance_cr', (rec->>'balance_cr')::numeric,
      'cor', jsonb_build_object('ai_transcription', round(v_cor_ai,4), 'caption', round(v_cor_cap,4),
        'ai_summary', round(v_cor_sum,4), 'rag', round(v_cor_rag,4), 'storage', round(v_cor_sto,4),
        'measured_total', round(v_cor_meas_total,4), 'against_revenue', round(v_cor_rev,4),
        'payment_fee', jsonb_build_object('recognized', round(v_rec_fee,4), 'deferred', round(v_def_fee,4),
          'purchased', round(v_purch_fee,4), 'by_type', v_fee_by_type),
        'against_revenue_by_method', jsonb_build_object(
          'ai_transcription', (rec#>>'{against_revenue_by_method,ai_transcription}')::numeric,
          'caption', (rec#>>'{against_revenue_by_method,caption}')::numeric,
          'ai_summary', (rec#>>'{against_revenue_by_method,ai_summary}')::numeric,
          'rag', 0, 'storage', (rec#>>'{against_revenue_by_method,storage}')::numeric,
          'payment_fee', (rec#>>'{against_revenue_by_method,payment_fee}')::numeric)),
      'gross_profit', round(v_gross,2), 'gross_margin', CASE WHEN v_revdel>0 THEN round(v_gross/v_revdel,4) ELSE NULL END,
      'measured_opex', jsonb_build_object('goodwill', round(v_good,4), 'funnel_loggedin', round(v_fun_ll,4),
        'funnel_anon', round(v_fun_an,4), 'radar_fee', round(v_radar_fee,2), 'radar', v_radar,
        'proxy_overhead', round(v_proxy_oh,4),
        'proxy_reconciliation', round(CASE WHEN v_internal=false THEN v_recon_gap_cost ELSE 0 END,4),
        'total', round(v_opex_meas,4)),
      'reconciliation', v_recon,
      'payment_methods', v_pay_methods,
      'entered_opex_total', CASE WHEN v_internal=false THEN round(v_entered_total,2) ELSE 0 END,
      'net_profit', round(v_net,2), 'net_margin', CASE WHEN v_revdel>0 THEN round(v_net/v_revdel,4) ELSE NULL END,
      'bank', jsonb_build_object('charged', round(v_charged,2), 'stripe_fee', round(v_fee,2),
        'settled_computed', round(v_charged - v_fee,2), 'net_settlement', round(v_net_settle,2),
        'vat_owed', round(v_vat,2), 'revenue_ex_vat', round(v_charged - v_vat,2)),
      'cache_savings', jsonb_build_object(
        'ai_transcription', jsonb_build_object('hit_credits', v_ai_hit_cr, 'total_jobs', v_ai_n, 'hit_jobs', v_ai_hit_n,
          'pct', CASE WHEN v_ai_n>0 THEN round(v_ai_hit_n::numeric/v_ai_n,4) ELSE 0 END, 'saved_eur', round(v_ai_saved,4)),
        'caption', jsonb_build_object('hit_count', v_cap_hit_n, 'total_count', v_cap_n,
          'pct', CASE WHEN v_cap_n>0 THEN round(v_cap_hit_n::numeric/v_cap_n,4) ELSE 0 END, 'saved_eur', round(v_cap_saved,4))),
      'deferred', jsonb_build_object('balance', round(v_defbal,2), 'credits', v_defer_credits,
        'deferred_fee', round(v_def_fee,2),
        'est_future_cost', CASE WHEN v_est_sufficient THEN round(v_est_future_cost,2) ELSE NULL END,
        'est_future_gross', CASE WHEN v_est_sufficient THEN round(v_defbal - v_est_future_cost - v_def_fee,2) ELSE NULL END,
        'est_data_sufficient', v_est_sufficient, 'window_days', v_defer_win),
      'storage_bytes', v_stor_bytes,
      'storage_approx', v_storage_approx,
      'drivers', (rec->'drivers') || jsonb_build_object(
        'funnel_anon', jsonb_build_object('proxy_bytes', v_fun_an_bytes),
        'goodwill', jsonb_build_object('granted_credits',
          GREATEST((rec->>'consumed_cr')::numeric - (rec->>'consumed_purchased_cr')::numeric, 0)),
        'proxy_overhead', jsonb_build_object('fail_bytes', v_proxy_fail_bytes, 'global_bytes', v_proxy_global_bytes,
          'total_bytes', v_proxy_oh_bytes, 'by_category', v_proxy_by_cat))
    ), true);
  END LOOP;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days_win),
    'rates', jsonb_build_object('decodo_eur_per_gb', cfg.decodo_eur_per_gb, 'assemblyai_eur_per_min', cfg.assemblyai_eur_per_min,
      'deepseek_eur_per_1k_input_tokens', cfg.deepseek_eur_per_1k_input_tokens,
      'deepseek_eur_per_1k_output_tokens', cfg.deepseek_eur_per_1k_output_tokens,
      'deepseek_eur_per_1k_cache_hit_tokens', cfg.deepseek_eur_per_1k_cache_hit_tokens,
      'r2_usd_per_gb_month', cfg.r2_usd_per_gb_month, 'r2_free_gb', cfg.r2_free_gb, 'usd_eur_rate', cfg.usd_eur_rate,
      'radar_eur_per_screen', cfg.radar_eur_per_screen, 'radar_free_until', cfg.radar_free_until),
    'entered_opex', v_entered, 'external', blocks->'external', 'internal', blocks->'internal');
END;
$function$;
