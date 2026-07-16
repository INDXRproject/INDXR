-- F18: proxy-completeness. Count ALL Decodo egress, not only successful jobs.
--
-- The gap: COR counts proxy bytes only on completed transcription jobs + paid captions. Everything else
-- that spends proxy counts nothing — failed/non-complete jobs, playlist-info & metadata scrapes, and the
-- extract_info egress of caption attempts that find nothing. This lands those bytes as a single OPEX line
-- "Proxy overhead" (bytes × decodo_eur_per_gb), driver visible (F15 style).
--
-- WHERE it lands: OPEX, not COR — this traffic yields no delivered/paid unit (pre-purchase scrapes,
-- failed/refunded jobs, blocked extractions). COR = cost of a DELIVERED unit; the model already books
-- proxy-egress-without-delivery (free-caption funnel) as OPEX, so this is the same species. Consistent.
--
-- NO double count (proven): COR uses transcription_jobs status='complete' AND caption usage_logs rows with
-- bytes; overhead uses (a) transcription_jobs status<>'complete' (disjoint by status) and (b) the new
-- proxy_usage_log, which records ONLY paths that never write proxy_bytes to transcription_jobs/usage_logs
-- (playlist-info, metadata, caption-failure extract_info egress). A caption failure logs usage_logs with
-- proxy_bytes=0, so its bytes live only in proxy_usage_log — no overlap.
--
-- FORWARD-ONLY: proxy_usage_log starts empty; from the first logged call it is complete. No backfill.

CREATE TABLE IF NOT EXISTS public.proxy_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  category    text NOT NULL,            -- 'playlist_info' | 'metadata' | 'caption_failed' (+ future)
  bytes       bigint NOT NULL           -- decompressed proxy egress of this call
);
CREATE INDEX IF NOT EXISTS proxy_usage_log_occurred_at_idx ON public.proxy_usage_log (occurred_at);
ALTER TABLE public.proxy_usage_log ENABLE ROW LEVEL SECURITY;
-- No policies → anon/authenticated denied; only the service-role backend writes/reads (bypasses RLS).
REVOKE ALL ON public.proxy_usage_log FROM anon, authenticated;
GRANT ALL ON public.proxy_usage_log TO service_role;

-- finance_daily_snapshot: store the new OPEX component so the frozen trend net stays reconcilable.
ALTER TABLE public.finance_daily_snapshot ADD COLUMN IF NOT EXISTS opex_proxy_overhead numeric NOT NULL DEFAULT 0;

-- _geld_scope: add proxy_fail_bytes (non-complete transcription jobs, per scope via the users array).
-- Disjoint from COR's ai_transcription (status='complete'). Purely additive key.
CREATE OR REPLACE FUNCTION public._geld_scope(p_internal boolean, p_from timestamp with time zone DEFAULT '-infinity'::timestamp with time zone, p_to timestamp with time zone DEFAULT 'infinity'::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg public.cost_config%ROWTYPE; users uuid[];
  v_purchased_cr numeric := 0; v_gross numeric := 0; v_vat numeric := 0;
  v_vat_unmeas_n integer := 0; v_vat_unmeas_gross numeric := 0; v_vat_by_country jsonb := '{}'::jsonb;
  v_granted_cr numeric := 0; v_consumed_cr numeric := 0;
  v_cons_ai numeric := 0; v_cons_cap numeric := 0; v_cons_sum numeric := 0; v_cons_rag numeric := 0;
  v_balance_cr numeric := 0; rec_to jsonb; rec_from jsonb;
  v_recognized numeric := 0; v_deferred numeric := 0; v_cons_purch_to numeric := 0; v_consumed_to numeric := 0;
  v_per_credit_net numeric := 0;
  v_dur_sec numeric := 0; v_proxy_bytes numeric := 0; v_prompt_tok numeric := 0; v_compl_tok numeric := 0; v_cache_tok numeric := 0;
  v_proxy_fail_bytes numeric := 0;
  v_cor_ai numeric := 0; v_cor_cap numeric := 0; v_cor_sum numeric := 0; v_cor_rag numeric := 0; v_cor_total numeric := 0;
  v_purchased_share numeric := 0; v_cor_rev numeric := 0; v_granted_deliv numeric := 0; v_gross_profit numeric := 0;
  v_ar_ai numeric := 0; v_ar_cap numeric := 0; v_ar_sum numeric := 0; v_ar_sto numeric := 0; v_goodwill numeric := 0;
  v_recognized_fee numeric := 0; v_deferred_fee numeric := 0; v_deferred_credits numeric := 0; v_purchased_fee numeric := 0;
  v_cap_paid_bytes numeric := 0; v_cap_free_bytes numeric := 0; v_funnel_free_cap numeric := 0;
  v_seg_free_ll jsonb; v_seg_paid_after jsonb; v_seg_paid_cap jsonb;
  v_from_d date; v_to_d date; v_days_win numeric := 1; v_days_month numeric := 1;
  v_stor_bytes numeric := 0; v_stor_gb numeric := 0; v_cor_sto numeric := 0;
  v_storage_approx boolean := false; v_series_min date;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users FROM public.profiles WHERE is_internal = p_internal;

  SELECT COALESCE(sum(gross),0),
         COALESCE(sum(COALESCE((sv->>'vat')::numeric,0)),0),
         COALESCE(sum(cr),0),
         COALESCE(count(*) FILTER (WHERE sv->>'status'='unknown'),0),
         COALESCE(sum(gross) FILTER (WHERE sv->>'status'='unknown'),0)
    INTO v_gross, v_vat, v_purchased_cr, v_vat_unmeas_n, v_vat_unmeas_gross
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount AS cr,
      COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross,
      public._sale_vat(ct.metadata) AS sv,
      ct.metadata->>'customer_country' AS country
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at >= p_from AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  SELECT COALESCE(jsonb_object_agg(country, obj), '{}'::jsonb) INTO v_vat_by_country FROM (
    SELECT COALESCE(country,'??') AS country,
      jsonb_build_object(
        'vat', round(sum(COALESCE((sv->>'vat')::numeric,0)),2),
        'gross', round(sum(gross),2),
        'count', count(*),
        'unknown_vat', bool_or(sv->>'status'='unknown'),
        'rate_implied', CASE WHEN sum(gross) > sum(COALESCE((sv->>'vat')::numeric,0))
                          THEN round(sum(COALESCE((sv->>'vat')::numeric,0)) / (sum(gross) - sum(COALESCE((sv->>'vat')::numeric,0))),4)
                          ELSE NULL END
      ) AS obj
    FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
        COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross,
        public._sale_vat(ct.metadata) AS sv,
        ct.metadata->>'customer_country' AS country
      FROM public.credit_transactions ct
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
        AND ct.created_at >= p_from AND ct.created_at < p_to
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s2 GROUP BY COALESCE(country,'??')
  ) g;

  SELECT COALESCE(sum(amount),0) INTO v_granted_cr
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  SELECT COALESCE(sum(amount),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_transcription'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='caption'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_summary'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='rag'),0)
    INTO v_consumed_cr, v_cons_ai, v_cons_cap, v_cons_sum, v_cons_rag
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;

  SELECT COALESCE(sum(credits),0) INTO v_balance_cr FROM public.user_credits WHERE user_id = ANY(users);

  SELECT COALESCE(sum(duration_seconds),0), COALESCE(sum(proxy_bytes),0) INTO v_dur_sec, v_proxy_bytes
  FROM public.transcription_jobs
  WHERE status='complete' AND cache_hit = false AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;
  v_cor_ai := (v_dur_sec/60.0)*cfg.assemblyai_eur_per_min + (v_proxy_bytes/1e9)*cfg.decodo_eur_per_gb;

  -- F18: proxy egress of jobs that did NOT complete (failed/blocked/running). Already measured in the column
  -- (audio_utils persists cumulative bytes even on failure) but excluded from COR by the status filter above.
  -- Disjoint from v_proxy_bytes (complete-only) → no double count.
  SELECT COALESCE(sum(proxy_bytes),0) INTO v_proxy_fail_bytes
  FROM public.transcription_jobs
  WHERE status <> 'complete' AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;

  SELECT COALESCE(sum(prompt_tokens),0), COALESCE(sum(completion_tokens),0), COALESCE(sum(cache_hit_tokens),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.ai_summary_usage_log
  WHERE user_id = ANY(users) AND generated_at >= p_from AND generated_at < p_to;
  v_cor_sum := (GREATEST(v_prompt_tok - v_cache_tok,0)/1000.0)*cfg.deepseek_eur_per_1k_input_tokens
             + (v_cache_tok/1000.0)*cfg.deepseek_eur_per_1k_cache_hit_tokens
             + (v_compl_tok/1000.0)*cfg.deepseek_eur_per_1k_output_tokens;

  SELECT COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used > 0), 0),
         COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used = 0), 0)
    INTO v_cap_paid_bytes, v_cap_free_bytes
  FROM public.usage_logs
  WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal AND created_at >= p_from AND created_at < p_to;
  v_cor_cap := (v_cap_paid_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_funnel_free_cap := (v_cap_free_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_cor_rag := 0; v_cor_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag;

  IF p_from > '-infinity'::timestamptz AND p_to < 'infinity'::timestamptz THEN
    v_from_d := (p_from AT TIME ZONE 'Europe/Amsterdam')::date;
    v_to_d   := (p_to   AT TIME ZONE 'Europe/Amsterdam')::date;
    v_days_win   := GREATEST(1, (v_to_d - v_from_d));
    v_days_month := EXTRACT(DAY FROM (date_trunc('month', p_to::timestamp) + interval '1 month - 1 day'));
  END IF;
  IF NOT p_internal THEN
    SELECT min(day) INTO v_series_min FROM public.daily_library_bytes;
    v_storage_approx := NOT (v_series_min IS NOT NULL AND v_from_d IS NOT NULL AND v_series_min <= v_from_d);
    IF v_storage_approx THEN
      SELECT COALESCE(sum(uc.library_bytes),0) INTO v_stor_bytes
      FROM public.user_credits uc WHERE uc.user_id = ANY(users);
    ELSE
      SELECT COALESCE(sum(b.bytes),0) INTO v_stor_bytes FROM (
        SELECT DISTINCT ON (l.user_id) l.library_bytes AS bytes
        FROM public.daily_library_bytes l
        WHERE l.user_id = ANY(users) AND l.day < v_to_d
        ORDER BY l.user_id, l.day DESC
      ) b;
    END IF;
    v_stor_gb := v_stor_bytes / 1e9;
    v_cor_sto := GREATEST(0, v_stor_gb - COALESCE(cfg.r2_free_gb,0))
                 * COALESCE(cfg.r2_usd_per_gb_month,0) * COALESCE(cfg.usd_eur_rate,1)
                 * (v_days_win / v_days_month);
  END IF;

  rec_to := public._recognize_asof(users, p_to); rec_from := public._recognize_asof(users, p_from);
  v_recognized     := (rec_to->>'recognized')::numeric - (rec_from->>'recognized')::numeric;
  v_deferred       := (rec_to->>'deferred')::numeric;
  v_deferred_fee   := (rec_to->>'deferred_fee')::numeric;
  v_deferred_credits := (rec_to->>'deferred_credits')::numeric;
  v_recognized_fee := (rec_to->>'recognized_fee')::numeric - (rec_from->>'recognized_fee')::numeric;
  v_purchased_fee  := (rec_to->>'purchased_fee')::numeric - (rec_from->>'purchased_fee')::numeric;
  v_cons_purch_to  := (rec_to->>'purchased_consumed')::numeric;
  v_consumed_to    := (rec_to->>'consumed_cr')::numeric;
  v_per_credit_net := CASE WHEN (rec_to->>'purchased_cr')::numeric > 0
                        THEN (rec_to->>'purchased_net')::numeric / (rec_to->>'purchased_cr')::numeric ELSE 0 END;
  v_purchased_share := CASE WHEN v_consumed_to > 0 THEN v_cons_purch_to / v_consumed_to ELSE 0 END;

  SELECT
    COALESCE(sum(uc.ai  * sh.share),0),
    COALESCE(sum(uc.cap * sh.share),0),
    COALESCE(sum(uc.sm  * sh.share),0),
    COALESCE(sum(uc.st  * sh.share),0),
    COALESCE(sum((uc.ai + uc.cap + uc.sm + uc.st) * (1 - sh.share)),0)
  INTO v_ar_ai, v_ar_cap, v_ar_sum, v_ar_sto, v_goodwill
  FROM (
    SELECT gu AS uid, COALESCE(a.c,0) AS ai, COALESCE(c.c,0) AS cap, COALESCE(s.c,0) AS sm,
      CASE WHEN NOT p_internal AND v_stor_bytes > 0 THEN
        v_cor_sto * (
          CASE WHEN v_storage_approx
            THEN (SELECT COALESCE(uc2.library_bytes,0) FROM public.user_credits uc2 WHERE uc2.user_id = gu)
            ELSE (SELECT COALESCE(l.library_bytes,0) FROM public.daily_library_bytes l
                   WHERE l.user_id = gu AND l.day < v_to_d ORDER BY l.day DESC LIMIT 1)
          END
        ) / v_stor_bytes
        ELSE 0 END AS st
    FROM unnest(users) AS gu
    LEFT JOIN (
      SELECT user_id, COALESCE(sum(duration_seconds),0)/60.0*cfg.assemblyai_eur_per_min + COALESCE(sum(proxy_bytes),0)/1e9*cfg.decodo_eur_per_gb AS c
      FROM public.transcription_jobs
      WHERE status='complete' AND cache_hit=false AND created_at >= p_from AND created_at < p_to
      GROUP BY user_id
    ) a ON a.user_id = gu
    LEFT JOIN (
      SELECT user_id, COALESCE(sum(proxy_bytes),0)/1e9*cfg.decodo_eur_per_gb AS c
      FROM public.usage_logs
      WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal AND credits_used > 0
        AND created_at >= p_from AND created_at < p_to
      GROUP BY user_id
    ) c ON c.user_id = gu
    LEFT JOIN (
      SELECT user_id,
        GREATEST(COALESCE(sum(prompt_tokens),0) - COALESCE(sum(cache_hit_tokens),0),0)/1000.0*cfg.deepseek_eur_per_1k_input_tokens
        + COALESCE(sum(cache_hit_tokens),0)/1000.0*cfg.deepseek_eur_per_1k_cache_hit_tokens
        + COALESCE(sum(completion_tokens),0)/1000.0*cfg.deepseek_eur_per_1k_output_tokens AS c
      FROM public.ai_summary_usage_log
      WHERE generated_at >= p_from AND generated_at < p_to
      GROUP BY user_id
    ) s ON s.user_id = gu
  ) uc
  CROSS JOIN LATERAL (
    SELECT CASE WHEN pcons > 0 THEN ppc / pcons ELSE 0 END AS share
    FROM (SELECT
       COALESCE((rec_to->'by_user'->(uc.uid::text)->>'purchased_consumed')::numeric,0) - COALESCE((rec_from->'by_user'->(uc.uid::text)->>'purchased_consumed')::numeric,0) AS ppc,
       COALESCE((rec_to->'by_user'->(uc.uid::text)->>'consumed_cr')::numeric,0) - COALESCE((rec_from->'by_user'->(uc.uid::text)->>'consumed_cr')::numeric,0) AS pcons
    ) qq
  ) sh;

  v_cor_rev := v_ar_ai + v_ar_cap + v_ar_sum + v_ar_sto + v_recognized_fee;
  v_granted_deliv := v_goodwill;
  v_gross_profit := v_recognized - v_cor_rev;

  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_free_ll
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=false
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_paid_after
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=true
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0)) INTO v_seg_paid_cap
   FROM public.usage_logs WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used>0
     AND created_at >= p_from AND created_at < p_to;

  RETURN jsonb_build_object(
    'cash_in_gross', round(v_gross,2),
    'vat', round(v_vat,2),
    'vat_measured_all', (v_vat_unmeas_n = 0),
    'vat_unmeasured_count', v_vat_unmeas_n,
    'vat_unmeasured_gross', round(v_vat_unmeas_gross,2),
    'vat_by_country', v_vat_by_country,
    'revenue_net', round(v_gross - v_vat,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit_net,4),
    'consumed_purchased_cr', v_cons_purch_to,
    'recognized_revenue', round(v_recognized,2),
    'deferred_revenue', round(v_deferred,2),
    'deferred_credits', v_deferred_credits,
    'recognized_fee', round(v_recognized_fee,4),
    'deferred_fee', round(v_deferred_fee,4),
    'purchased_fee', round(v_purchased_fee,4),
    'consumed_by_type', jsonb_build_object('ai_transcription', v_cons_ai, 'caption', v_cons_cap, 'ai_summary', v_cons_sum, 'rag', v_cons_rag),
    'cor', jsonb_build_object('ai_transcription', round(v_cor_ai,4), 'caption', round(v_cor_cap,4),
      'ai_summary', round(v_cor_sum,4), 'rag', round(v_cor_rag,4), 'storage', round(v_cor_sto,4), 'total', round(v_cor_total,4)),
    'cor_caption_estimated', false,
    'cor_against_revenue', round(v_cor_rev,4),
    'against_revenue_by_method', jsonb_build_object('ai_transcription', round(v_ar_ai,4), 'caption', round(v_ar_cap,4),
      'ai_summary', round(v_ar_sum,4), 'rag', 0, 'storage', round(v_ar_sto,4), 'payment_fee', round(v_recognized_fee,4)),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'funnel_free_caption_cost', round(v_funnel_free_cap,4),
    'caption_segments', jsonb_build_object('free_loggedin', v_seg_free_ll, 'paid_after', v_seg_paid_after, 'paid_caption', v_seg_paid_cap),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END,
    'purchased_share', round(v_purchased_share,6),
    'storage_bytes', v_stor_bytes,
    'storage_approx', v_storage_approx,
    'proxy_fail_bytes', v_proxy_fail_bytes,
    'drivers', jsonb_build_object(
      'ai_transcription', jsonb_build_object('audio_seconds', v_dur_sec, 'proxy_bytes', v_proxy_bytes),
      'caption', jsonb_build_object('proxy_bytes', v_cap_paid_bytes),
      'ai_summary', jsonb_build_object('input_tokens', v_prompt_tok, 'cache_tokens', v_cache_tok, 'output_tokens', v_compl_tok),
      'storage', jsonb_build_object('gb', round(v_stor_gb,6), 'free_gb', COALESCE(cfg.r2_free_gb,0),
        'days_win', v_days_win, 'days_month', v_days_month),
      'funnel_loggedin', jsonb_build_object('proxy_bytes', v_cap_free_bytes))
  );
END;
$function$;

-- admin_finance_summary: add the "Proxy overhead" OPEX line = (per-scope failed-job bytes) + (external-only
-- global proxy_usage_log bytes), × decodo rate. Driver exposed under drivers.proxy_overhead.
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

      -- F18: global proxy overhead (playlist-info / metadata / caption-failure) is not user-attributable →
      -- booked in the external (real economy) scope only, like funnel_anon.
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

    -- F18: overhead bytes = failed-job (per scope) + global log (external only). Cost = bytes × decodo rate.
    v_proxy_oh_bytes := v_proxy_fail_bytes + v_proxy_global_bytes;
    v_proxy_oh := (v_proxy_oh_bytes/1e9) * cfg.decodo_eur_per_gb;

    v_cor_meas_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag + v_cor_sto;
    v_gross := v_revdel - v_cor_rev;
    v_opex_meas := v_good + v_fun_ll + v_fun_an + v_radar_fee + v_proxy_oh;
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
        'proxy_overhead', round(v_proxy_oh,4), 'total', round(v_opex_meas,4)),
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

-- snapshot_finance_day: fold proxy overhead into the frozen trend net + store the component (forward-only).
CREATE OR REPLACE FUNCTION public.snapshot_finance_day(p_day date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  d          date;
  from_utc   timestamptz;
  to_utc     timestamptz;
  cfg        public.cost_config%ROWTYPE;
  v_scope    text;
  v_internal boolean;
  rec        jsonb;
  v_cash     numeric; v_vat numeric; v_revdel numeric;
  v_cor_ai   numeric; v_cor_cap numeric; v_cor_sum numeric; v_cor_rag numeric; v_cor_sto numeric;
  v_cor_rev  numeric;
  v_fun_ll   numeric; v_fun_an numeric; v_good numeric; v_fee numeric;
  v_radar_fee numeric; v_scr_sb integer; v_scr_fb integer;
  v_proxy_fail numeric; v_proxy_global numeric; v_proxy_oh numeric;
  v_sold     numeric; v_cons numeric; v_deferred numeric;
  v_gr_to    numeric; v_cons_to numeric; v_outfree numeric;
  v_stor_b   numeric;
  v_net      numeric;
  out        jsonb := '[]'::jsonb;
BEGIN
  d        := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1);
  from_utc := d::timestamp            AT TIME ZONE 'Europe/Amsterdam';
  to_utc   := (d + 1)::timestamp      AT TIME ZONE 'Europe/Amsterdam';

  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  INSERT INTO public.daily_library_bytes (day, user_id, library_bytes)
  SELECT d, uc.user_id, COALESCE(uc.library_bytes,0)
  FROM public.user_credits uc JOIN public.profiles p ON p.id = uc.user_id
  WHERE NOT p.is_internal
  ON CONFLICT (day, user_id) DO UPDATE SET library_bytes = EXCLUDED.library_bytes, created_at = now();

  FOR v_scope, v_internal IN
    SELECT s, i FROM (VALUES ('external', false), ('internal', true)) AS t(s, i)
  LOOP
    rec := public._geld_scope(v_internal, from_utc, to_utc);

    v_cash    := (rec->>'cash_in_gross')::numeric;
    v_vat     := (rec->>'vat')::numeric;
    v_revdel  := (rec->>'recognized_revenue')::numeric;
    v_cor_ai  := (rec#>>'{cor,ai_transcription}')::numeric;
    v_cor_cap := (rec#>>'{cor,caption}')::numeric;
    v_cor_sum := (rec#>>'{cor,ai_summary}')::numeric;
    v_cor_rag := (rec#>>'{cor,rag}')::numeric;
    v_cor_sto := (rec#>>'{cor,storage}')::numeric;
    v_cor_rev := (rec->>'cor_against_revenue')::numeric;
    v_stor_b  := (rec->>'storage_bytes')::numeric;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric;
    v_sold    := (rec->>'purchased_cr')::numeric;
    v_cons    := (rec->>'consumed_cr')::numeric;
    v_deferred:= (rec->>'deferred_revenue')::numeric;
    v_proxy_fail := COALESCE((rec->>'proxy_fail_bytes')::numeric, 0);

    SELECT COALESCE(sum(fee),0) INTO v_fee FROM (
      SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
             COALESCE((ct.metadata->>'stripe_fee')::numeric,0) AS fee
      FROM public.credit_transactions ct
      JOIN public.profiles p ON p.id = ct.user_id AND p.is_internal = v_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id'
        AND ct.created_at >= from_utc AND ct.created_at < to_utc
      ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
    ) s;

    SELECT COALESCE(sum(ct.amount),0) INTO v_gr_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
      AND (ct.kind IS NULL OR ct.kind<>'refund') AND ct.created_at < to_utc;
    SELECT COALESCE(sum(ct.amount),0) INTO v_cons_to
    FROM public.credit_transactions ct JOIN public.profiles p ON p.id=ct.user_id AND p.is_internal=v_internal
    WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.created_at < to_utc;
    v_outfree := GREATEST(0, v_gr_to - v_cons_to);

    IF v_internal = false THEN
      SELECT COALESCE(sum(caption_proxy_bytes),0) INTO v_fun_an
      FROM public.daily_cost_counters WHERE day = d;
      v_fun_an := (v_fun_an/1e9) * cfg.decodo_eur_per_gb;

      SELECT COALESCE(sum(bytes),0) INTO v_proxy_global
      FROM public.proxy_usage_log WHERE occurred_at >= from_utc AND occurred_at < to_utc;

      SELECT count(DISTINCT ct.metadata->>'stripe_session_id') FILTER (WHERE ct.created_at >= cfg.radar_free_until::timestamptz)
        INTO v_scr_sb
      FROM public.credit_transactions ct
      JOIN public.profiles pr ON pr.id = ct.user_id AND NOT pr.is_internal
      WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.created_at >= from_utc AND ct.created_at < to_utc;
      SELECT count(*) FILTER (WHERE screened AND occurred_at >= cfg.radar_free_until::timestamptz)
        INTO v_scr_fb
      FROM public.payment_attempts pa
      LEFT JOIN public.profiles pr ON pr.id = pa.user_id
      WHERE NOT COALESCE(pr.is_internal, false) AND pa.occurred_at >= from_utc AND pa.occurred_at < to_utc;
      v_radar_fee := (COALESCE(v_scr_sb,0) + COALESCE(v_scr_fb,0)) * COALESCE(cfg.radar_eur_per_screen,0);
    ELSE
      v_fun_an := 0; v_radar_fee := 0; v_proxy_global := 0;
    END IF;

    v_proxy_oh := ((v_proxy_fail + COALESCE(v_proxy_global,0))/1e9) * cfg.decodo_eur_per_gb;

    v_net := v_revdel
             - v_cor_rev
             - (v_good + v_fun_ll + v_fun_an + v_radar_fee + v_proxy_oh);

    INSERT INTO public.finance_daily_snapshot AS f (
      snapshot_date, scope, cash_in, vat, revenue_delivered, stripe_fee,
      cor_ai_transcription, cor_caption, cor_ai_summary, cor_rag, cor_storage,
      opex_funnel_loggedin, opex_funnel_anon, opex_goodwill, opex_proxy_overhead, net_profit_measured,
      credits_sold, credits_consumed, deferred_balance, outstanding_free_credits, storage_bytes)
    VALUES (
      d, v_scope, v_cash, v_vat, v_revdel, v_fee,
      v_cor_ai, v_cor_cap, v_cor_sum, v_cor_rag, v_cor_sto,
      v_fun_ll, v_fun_an, v_good, round(v_proxy_oh,6), v_net,
      v_sold, v_cons, v_deferred, v_outfree, v_stor_b)
    ON CONFLICT (snapshot_date, scope) DO UPDATE SET
      cash_in=EXCLUDED.cash_in, vat=EXCLUDED.vat, revenue_delivered=EXCLUDED.revenue_delivered,
      stripe_fee=EXCLUDED.stripe_fee, cor_ai_transcription=EXCLUDED.cor_ai_transcription,
      cor_caption=EXCLUDED.cor_caption, cor_ai_summary=EXCLUDED.cor_ai_summary, cor_rag=EXCLUDED.cor_rag,
      cor_storage=EXCLUDED.cor_storage, opex_funnel_loggedin=EXCLUDED.opex_funnel_loggedin,
      opex_funnel_anon=EXCLUDED.opex_funnel_anon, opex_goodwill=EXCLUDED.opex_goodwill,
      opex_proxy_overhead=EXCLUDED.opex_proxy_overhead,
      net_profit_measured=EXCLUDED.net_profit_measured, credits_sold=EXCLUDED.credits_sold,
      credits_consumed=EXCLUDED.credits_consumed, deferred_balance=EXCLUDED.deferred_balance,
      outstanding_free_credits=EXCLUDED.outstanding_free_credits, storage_bytes=EXCLUDED.storage_bytes,
      created_at=now();

    out := out || jsonb_build_object('scope', v_scope, 'net_profit_measured', round(v_net,4),
                   'revenue_delivered', round(v_revdel,4), 'cash_in', round(v_cash,2));
  END LOOP;

  RETURN jsonb_build_object('snapshot_date', d, 'from_utc', from_utc, 'to_utc', to_utc, 'rows', out);
END;
$function$;
