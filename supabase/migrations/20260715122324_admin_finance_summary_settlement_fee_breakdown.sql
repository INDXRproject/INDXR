-- P4 bankbrug in settlement-EUR (charged = settlement_amount, fallback amount_paid); vat_computed = "alle
-- sales gemeten" (rec.vat_measured_all). P5: fee_details per component (stripe_fee_by_type) + betaalmethodes
-- per periode. P2: vat_unmeasured (count+gross) doorgegeven aan de UI.
CREATE OR REPLACE FUNCTION public.admin_finance_summary(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg public.cost_config%ROWTYPE; v_scope text; v_internal boolean; rec jsonb; blocks jsonb := '{}'::jsonb;
  v_from_d date; v_to_d date; v_days_win numeric; v_days_month numeric; v_defer_win integer;
  v_cash numeric; v_vat numeric; v_revdel numeric; v_defbal numeric; v_percredit numeric;
  v_cor_ai numeric; v_cor_cap numeric; v_cor_sum numeric; v_cor_rag numeric; v_cor_sto numeric;
  v_cor_meas_total numeric; v_cor_rev numeric; v_good numeric; v_fun_ll numeric; v_fun_an numeric;
  v_fee numeric; v_charged numeric; v_net_settle numeric; v_vat_computed boolean;
  v_gross numeric; v_opex_meas numeric; v_net numeric; v_stor_bytes numeric; v_stor_gb numeric; v_share numeric;
  v_ai_hit_cr numeric; v_ai_miss_cr numeric; v_ai_hit_n integer; v_ai_n integer; v_ai_saved numeric;
  v_cap_hit_n integer; v_cap_n integer; v_cap_avg_miss numeric; v_cap_saved numeric;
  v_defer_credits numeric; v_recent jsonb; v_recent_cor numeric; v_recent_cons numeric; v_avg_cpc numeric; v_est_future_cost numeric;
  v_entered jsonb; v_entered_total numeric; v_fee_by_type jsonb; v_pay_methods jsonb;
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
    v_percredit := (rec->>'per_credit_net')::numeric;
    v_cor_ai  := (rec#>>'{cor,ai_transcription}')::numeric;
    v_cor_cap := (rec#>>'{cor,caption}')::numeric;
    v_cor_sum := (rec#>>'{cor,ai_summary}')::numeric;
    v_cor_rag := (rec#>>'{cor,rag}')::numeric;
    v_cor_rev := (rec->>'cor_against_revenue')::numeric;
    v_good    := (rec->>'granted_delivery_cost')::numeric;
    v_fun_ll  := (rec->>'funnel_free_caption_cost')::numeric;
    v_share   := (rec->>'purchased_share')::numeric;

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
      SELECT COALESCE(sum(caption_proxy_bytes),0) INTO v_fun_an FROM public.daily_cost_counters WHERE day >= v_from_d AND day < v_to_d;
      v_fun_an := (v_fun_an/1e9) * cfg.decodo_eur_per_gb;
      SELECT COALESCE(sum(uc.library_bytes),0) INTO v_stor_bytes FROM public.user_credits uc JOIN public.profiles p ON p.id=uc.user_id WHERE NOT p.is_internal;
      v_stor_gb := v_stor_bytes/1e9;
      v_cor_sto := GREATEST(0, v_stor_gb - COALESCE(cfg.r2_free_gb,0)) * COALESCE(cfg.r2_usd_per_gb_month,0) * COALESCE(cfg.usd_eur_rate,1) * (v_days_win / v_days_month);
    ELSE
      v_fun_an := 0; v_stor_bytes := 0; v_cor_sto := 0;
    END IF;

    v_cor_meas_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag + v_cor_sto;
    v_cor_rev := v_cor_rev + v_cor_sto;
    v_gross := v_revdel - v_cor_rev;
    v_opex_meas := v_good + v_fun_ll + v_fun_an + v_fee;
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

    v_defer_credits := CASE WHEN v_percredit > 0 THEN round(v_defbal / v_percredit) ELSE 0 END;
    v_recent := public._geld_scope(v_internal, p_to - make_interval(days => v_defer_win), p_to);
    v_recent_cor := (v_recent#>>'{cor,total}')::numeric; v_recent_cons := (v_recent->>'consumed_cr')::numeric;
    v_avg_cpc := CASE WHEN v_recent_cons > 0 THEN v_recent_cor / v_recent_cons ELSE 0 END;
    v_est_future_cost := v_defer_credits * v_avg_cpc;

    blocks := jsonb_set(blocks, ARRAY[v_scope], jsonb_build_object(
      'cash_in', round(v_cash,2), 'vat', round(v_vat,2), 'vat_computed', v_vat_computed,
      'vat_unmeasured', jsonb_build_object('count', (rec->>'vat_unmeasured_count')::integer, 'gross', (rec->>'vat_unmeasured_gross')::numeric),
      'revenue_delivered', round(v_revdel,2), 'deferred_balance', round(v_defbal,2),
      'credits_sold', (rec->>'purchased_cr')::numeric, 'credits_consumed', (rec->>'consumed_cr')::numeric,
      'consumed_by_type', rec->'consumed_by_type', 'purchased_share', v_share, 'balance_cr', (rec->>'balance_cr')::numeric,
      'cor', jsonb_build_object('ai_transcription', round(v_cor_ai,4), 'caption', round(v_cor_cap,4),
        'ai_summary', round(v_cor_sum,4), 'rag', round(v_cor_rag,4), 'storage', round(v_cor_sto,4),
        'measured_total', round(v_cor_meas_total,4), 'against_revenue', round(v_cor_rev,4),
        'against_revenue_by_method', jsonb_build_object('ai_transcription', round(v_cor_ai * v_share,4),
          'caption', round(v_cor_cap * v_share,4), 'ai_summary', round(v_cor_sum * v_share,4),
          'rag', round(v_cor_rag * v_share,4), 'storage', round(v_cor_sto,4))),
      'gross_profit', round(v_gross,2), 'gross_margin', CASE WHEN v_revdel>0 THEN round(v_gross/v_revdel,4) ELSE NULL END,
      'measured_opex', jsonb_build_object('goodwill', round(v_good,4), 'funnel_loggedin', round(v_fun_ll,4),
        'funnel_anon', round(v_fun_an,4), 'stripe_fee', round(v_fee,2), 'stripe_fee_by_type', v_fee_by_type, 'total', round(v_opex_meas,4)),
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
        'est_future_cost', round(v_est_future_cost,2), 'est_future_gross', round(v_defbal - v_est_future_cost,2), 'window_days', v_defer_win),
      'storage_bytes', v_stor_bytes
    ), true);
  END LOOP;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days_win),
    'rates', jsonb_build_object('decodo_eur_per_gb', cfg.decodo_eur_per_gb, 'assemblyai_eur_per_min', cfg.assemblyai_eur_per_min,
      'r2_usd_per_gb_month', cfg.r2_usd_per_gb_month, 'r2_free_gb', cfg.r2_free_gb, 'usd_eur_rate', cfg.usd_eur_rate),
    'entered_opex', v_entered, 'external', blocks->'external', 'internal', blocks->'internal');
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_finance_summary(timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_finance_summary(timestamptz, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary(timestamptz, timestamptz) TO service_role;
