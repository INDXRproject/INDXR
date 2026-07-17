-- Point 3 + 4 in admin_finance_summary:
--  (3) Split the Decodo reconciliation by the proxy-measurement boundary (finance_settings.proxy_measured_from):
--      - days >= boundary: billed vs measured = gap (~wire overhead). Same as before.
--      - days <  boundary: we captured NO proxy bytes → billed IS the cost (no gap possible). Booked as a
--        separate OPEX line 'proxy_historical' (external), shown honestly — not a 100% gap, not silent €0.
--  (4) Test/internal proxy egress (proxy_usage_log.is_internal) is kept OUT of the EXTERNAL proxy-overhead OPEX
--      and booked in INTERNAL instead. The account-level reconciliation still counts it on both sides (Decodo
--      billed it), so no fake gap appears.
-- Only the reconciliation block, the proxy-overhead scope filters, the new declarations and the two jsonb
-- additions change; every other formula is verbatim from 20260717100000.
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
  v_data_from date; v_cov_day_arr date[];
  v_meas_from date; v_billed_unver numeric := 0; v_unver_cost numeric := 0; v_ver_period_days numeric := 0;
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

  -- Decodo reconciliation, split at the proxy-measurement boundary (point 3).
  SELECT COALESCE((value #>> '{}')::date, DATE '2026-07-11') INTO v_meas_from FROM public.finance_settings WHERE key='proxy_measured_from';
  v_meas_from := COALESCE(v_meas_from, DATE '2026-07-11');
  -- VERIFIED covered days = decodo rows on/after the boundary → reconcile against our measurement.
  v_cov_day_arr := ARRAY(SELECT day FROM public.decodo_daily_usage WHERE day >= GREATEST(v_from_d, v_meas_from) AND day < v_to_d);
  SELECT COALESCE(sum(billed_bytes),0), count(*) INTO v_billed_bytes, v_cov_days
    FROM public.decodo_daily_usage WHERE day = ANY(v_cov_day_arr);
  -- UNVERIFIED billed = decodo rows before the boundary, in period → billed IS the cost (no measurement).
  SELECT COALESCE(sum(billed_bytes),0) INTO v_billed_unver
    FROM public.decodo_daily_usage WHERE day >= v_from_d AND day < LEAST(v_to_d, v_meas_from);
  v_unver_cost := (v_billed_unver/1e9) * cfg.decodo_eur_per_gb;
  SELECT min(day) INTO v_data_from FROM public.decodo_daily_usage WHERE day >= v_from_d AND day < v_to_d;
  SELECT last_success_at, last_error INTO v_decodo_ok, v_decodo_err FROM public.service_metrics WHERE service='decodo';
  v_ver_period_days := GREATEST(0, v_to_d - GREATEST(v_from_d, v_meas_from));  -- verified sub-window length

  IF v_cov_days = 0 THEN
    v_measured_bytes := 0; v_recon_gap_bytes := 0; v_recon_gap_cost := 0;
    v_recon_status := CASE WHEN v_billed_unver > 0 THEN 'unverified_only' ELSE 'unavailable' END;
  ELSE
    -- Measured = ALL our proxy bytes across both scopes (account-level; Decodo bills one proxy user), restricted
    -- to the verified covered days (UTC-day membership). Includes internal test rows so it matches billed.
    SELECT
      COALESCE((SELECT sum(proxy_bytes) FROM public.transcription_jobs
        WHERE created_at >= p_from AND created_at < p_to AND (created_at AT TIME ZONE 'UTC')::date = ANY(v_cov_day_arr)),0)
    + COALESCE((SELECT sum(proxy_bytes) FROM public.usage_logs
        WHERE extraction_type='caption' AND success AND created_at >= p_from AND created_at < p_to
          AND (created_at AT TIME ZONE 'UTC')::date = ANY(v_cov_day_arr)),0)
    + COALESCE((SELECT sum(caption_proxy_bytes) FROM public.daily_cost_counters WHERE day = ANY(v_cov_day_arr)),0)
    + COALESCE((SELECT sum(bytes) FROM public.proxy_usage_log
        WHERE occurred_at >= p_from AND occurred_at < p_to AND (occurred_at AT TIME ZONE 'UTC')::date = ANY(v_cov_day_arr)),0)
    INTO v_measured_bytes;
    v_recon_gap_bytes := v_billed_bytes - v_measured_bytes;
    v_recon_gap_cost := GREATEST(0, v_recon_gap_bytes)/1e9 * cfg.decodo_eur_per_gb;
    v_recon_status := CASE WHEN v_cov_days < v_ver_period_days THEN 'partial' ELSE 'ok' END;
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

      -- External proxy-overhead: real customer-side global egress only → EXCLUDE internal/test rows (point 4).
      SELECT COALESCE(sum(bytes),0) INTO v_proxy_global_bytes
      FROM public.proxy_usage_log WHERE occurred_at >= p_from AND occurred_at < p_to AND NOT is_internal;
      SELECT COALESCE(jsonb_object_agg(category, b), '{}'::jsonb) INTO v_proxy_by_cat FROM (
        SELECT category, sum(bytes) AS b FROM public.proxy_usage_log
        WHERE occurred_at >= p_from AND occurred_at < p_to AND NOT is_internal GROUP BY category
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
      -- Internal proxy-overhead: the test/internal global egress lands here, out of the real economy (point 4).
      SELECT COALESCE(sum(bytes),0) INTO v_proxy_global_bytes
      FROM public.proxy_usage_log WHERE occurred_at >= p_from AND occurred_at < p_to AND is_internal;
      SELECT COALESCE(jsonb_object_agg(category, b), '{}'::jsonb) INTO v_proxy_by_cat FROM (
        SELECT category, sum(bytes) AS b FROM public.proxy_usage_log
        WHERE occurred_at >= p_from AND occurred_at < p_to AND is_internal GROUP BY category
      ) q;
      v_radar_fee := 0;
      v_radar := jsonb_build_object('screens', 0, 'billable', 0, 'successful', 0, 'declined', 0, 'blocked', 0,
        'rate', COALESCE(cfg.radar_eur_per_screen,0), 'free_until', cfg.radar_free_until, 'fee', 0);
    END IF;

    v_proxy_oh_bytes := v_proxy_fail_bytes + v_proxy_global_bytes;
    v_proxy_oh := (v_proxy_oh_bytes/1e9) * cfg.decodo_eur_per_gb;

    -- Reconciliation gap + historical-unverified cost count in the EXTERNAL P&L only.
    IF v_internal = false THEN
      v_recon := jsonb_build_object('billed_bytes', v_billed_bytes, 'measured_bytes', v_measured_bytes,
        'gap_bytes', v_recon_gap_bytes, 'gap_cost', round(v_recon_gap_cost,4),
        'coverage_days', v_cov_days, 'period_days', v_ver_period_days, 'status', v_recon_status,
        'data_from', v_data_from, 'measured_from', v_meas_from,
        'unverified_billed_bytes', v_billed_unver, 'unverified_cost', round(v_unver_cost,4),
        'last_success_at', v_decodo_ok, 'last_error', v_decodo_err);
    ELSE
      v_recon := jsonb_build_object('status', 'not_applicable');
    END IF;

    v_cor_meas_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag + v_cor_sto;
    v_gross := v_revdel - v_cor_rev;
    v_opex_meas := v_good + v_fun_ll + v_fun_an + v_radar_fee + v_proxy_oh
                 + (CASE WHEN v_internal=false THEN v_recon_gap_cost + v_unver_cost ELSE 0 END);
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
        'proxy_historical', round(CASE WHEN v_internal=false THEN v_unver_cost ELSE 0 END,4),
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

REVOKE EXECUTE ON FUNCTION public.admin_finance_summary(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary(timestamptz, timestamptz) TO service_role;
