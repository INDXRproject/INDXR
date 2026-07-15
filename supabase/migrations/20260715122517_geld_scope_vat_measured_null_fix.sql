-- FIX: `measured` was NULL bij afwezige tax_status (NULL='complete' -> NULL), waardoor
-- count(*) FILTER (WHERE NOT measured) de onbekende-BTW-sales OVERSLOEG (NULL telt niet) -> count=0 i.p.v. 2.
-- COALESCE naar false zodat afwezige tax_status = onbekend = geteld. Rest van _geld_scope ongewijzigd.
CREATE OR REPLACE FUNCTION public._geld_scope(
  p_internal boolean, p_from timestamptz DEFAULT '-infinity', p_to timestamptz DEFAULT 'infinity')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg public.cost_config%ROWTYPE; users uuid[];
  v_purchased_cr numeric := 0; v_gross numeric := 0; v_vat numeric := 0; v_vat_known boolean := false;
  v_vat_unmeas_n integer := 0; v_vat_unmeas_gross numeric := 0;
  v_granted_cr numeric := 0; v_consumed_cr numeric := 0;
  v_cons_ai numeric := 0; v_cons_cap numeric := 0; v_cons_sum numeric := 0; v_cons_rag numeric := 0;
  v_balance_cr numeric := 0; rec_to jsonb; rec_from jsonb;
  v_recognized numeric := 0; v_deferred numeric := 0; v_cons_purch_to numeric := 0; v_consumed_to numeric := 0;
  v_per_credit_net numeric := 0;
  v_dur_sec numeric := 0; v_proxy_bytes numeric := 0; v_prompt_tok numeric := 0; v_compl_tok numeric := 0; v_cache_tok numeric := 0;
  v_cor_ai numeric := 0; v_cor_cap numeric := 0; v_cor_sum numeric := 0; v_cor_rag numeric := 0; v_cor_total numeric := 0;
  v_purchased_share numeric := 0; v_cor_rev numeric := 0; v_granted_deliv numeric := 0; v_gross_profit numeric := 0;
  v_cap_paid_bytes numeric := 0; v_cap_free_bytes numeric := 0; v_funnel_free_cap numeric := 0;
  v_seg_free_ll jsonb; v_seg_paid_after jsonb; v_seg_paid_cap jsonb;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users FROM public.profiles WHERE is_internal = p_internal;

  SELECT COALESCE(sum(gross),0), COALESCE(sum(vat_eur),0), COALESCE(bool_or(has_tax),false),
         COALESCE(sum(cr),0),
         COALESCE(count(*) FILTER (WHERE NOT measured),0),
         COALESCE(sum(gross) FILTER (WHERE NOT measured),0)
    INTO v_gross, v_vat, v_vat_known, v_purchased_cr, v_vat_unmeas_n, v_vat_unmeas_gross
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount AS cr,
      COALESCE((ct.metadata->>'settlement_amount')::numeric, (ct.metadata->>'amount_paid')::numeric, 0) AS gross,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0) * COALESCE((ct.metadata->>'exchange_rate')::numeric,1) AS vat_eur,
      (ct.metadata ? 'amount_tax') AS has_tax,
      ( COALESCE(ct.metadata->>'tax_status','') = 'complete' OR (ct.metadata ? 'invoice_tax') ) AS measured
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at >= p_from AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

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

  SELECT COALESCE(sum((ai_summary_usage->>'prompt_tokens')::numeric),0),
         COALESCE(sum((ai_summary_usage->>'completion_tokens')::numeric),0),
         COALESCE(sum(COALESCE((ai_summary_usage->>'prompt_cache_hit_tokens')::numeric,0)),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.transcripts
  WHERE ai_summary_usage IS NOT NULL AND user_id = ANY(users) AND created_at >= p_from AND created_at < p_to;
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

  rec_to := public._recognize_asof(users, p_to); rec_from := public._recognize_asof(users, p_from);
  v_recognized     := (rec_to->>'recognized')::numeric - (rec_from->>'recognized')::numeric;
  v_deferred       := (rec_to->>'deferred')::numeric;
  v_cons_purch_to  := (rec_to->>'purchased_consumed')::numeric;
  v_consumed_to    := (rec_to->>'consumed_cr')::numeric;
  v_per_credit_net := CASE WHEN (rec_to->>'purchased_cr')::numeric > 0
                        THEN (rec_to->>'purchased_net')::numeric / (rec_to->>'purchased_cr')::numeric ELSE 0 END;

  v_purchased_share := CASE WHEN v_consumed_to > 0 THEN v_cons_purch_to / v_consumed_to ELSE 0 END;
  v_cor_rev := v_cor_total * v_purchased_share;
  v_granted_deliv := v_cor_total * (1 - v_purchased_share);
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
    'vat_known', v_vat_known,
    'vat_measured_all', (v_vat_unmeas_n = 0),
    'vat_unmeasured_count', v_vat_unmeas_n,
    'vat_unmeasured_gross', round(v_vat_unmeas_gross,2),
    'revenue_net', round(v_gross - v_vat,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit_net,4),
    'consumed_purchased_cr', v_cons_purch_to,
    'recognized_revenue', round(v_recognized,2),
    'deferred_revenue', round(v_deferred,2),
    'consumed_by_type', jsonb_build_object('ai_transcription', v_cons_ai, 'caption', v_cons_cap, 'ai_summary', v_cons_sum, 'rag', v_cons_rag),
    'cor', jsonb_build_object('ai_transcription', round(v_cor_ai,4), 'caption', round(v_cor_cap,4),
      'ai_summary', round(v_cor_sum,4), 'rag', round(v_cor_rag,4), 'total', round(v_cor_total,4)),
    'cor_caption_estimated', false,
    'cor_against_revenue', round(v_cor_rev,4),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'funnel_free_caption_cost', round(v_funnel_free_cap,4),
    'caption_segments', jsonb_build_object('free_loggedin', v_seg_free_ll, 'paid_after', v_seg_paid_after, 'paid_caption', v_seg_paid_cap),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END,
    'purchased_share', round(v_purchased_share,6)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM anon, authenticated;
