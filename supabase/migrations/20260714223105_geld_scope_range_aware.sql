-- B1-fundament: _geld_scope range-aware maken zonder de output-vorm te wijzigen.
-- KEY-SET BLIJFT IDENTIEK (admin_geld_summary embed dit raw → geen nieuwe keys, anders breekt de regressie).
-- Semantiek: FLOWS gebonden op [p_from, p_to); STOCKS/recognitie cumulatief-<p_to.
-- Bij defaults (-infinity, +infinity) valt elke waarde samen met de huidige all-time-uitkomst.
-- recognized_revenue wordt PERIODE-flow (cum_to - cum_from); bij from=-infinity = cum_to = huidige waarde.
-- Nieuwe verfijning (regressie-veilig, geen bestaande true-rijen): ai-transcriptie-COR sluit cache_hit uit.

DROP FUNCTION IF EXISTS public._geld_scope(boolean);

CREATE FUNCTION public._geld_scope(
  p_internal boolean,
  p_from timestamptz DEFAULT '-infinity',
  p_to   timestamptz DEFAULT 'infinity'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg               public.cost_config%ROWTYPE;
  users             uuid[];
  -- period purchases (FLOW)
  v_purchased_cr    numeric := 0;
  v_gross           numeric := 0;
  v_vat             numeric := 0;
  v_vat_known       boolean := false;
  -- cumulative-<to / <from purchases (recognitie-internals)
  v_purchased_to    numeric := 0;
  v_gross_to        numeric := 0;
  v_vat_to          numeric := 0;
  v_purchased_from  numeric := 0;
  v_gross_from      numeric := 0;
  v_vat_from        numeric := 0;
  -- granted
  v_granted_cr      numeric := 0;   -- period
  v_granted_to      numeric := 0;
  v_granted_from    numeric := 0;
  -- consumed
  v_consumed_cr     numeric := 0;   -- period
  v_cons_ai         numeric := 0;
  v_cons_cap        numeric := 0;
  v_cons_sum        numeric := 0;
  v_cons_rag        numeric := 0;
  v_consumed_to     numeric := 0;
  v_consumed_from   numeric := 0;
  -- stocks / derived
  v_balance_cr      numeric := 0;
  v_per_credit_to   numeric := 0;
  v_per_credit_from numeric := 0;
  v_cons_purch_to   numeric := 0;
  v_cons_purch_from numeric := 0;
  v_recognized_to   numeric := 0;
  v_recognized_from numeric := 0;
  v_recognized      numeric := 0;   -- period flow
  v_deferred        numeric := 0;   -- stock as-of to
  v_per_credit_net  numeric := 0;   -- reported = per_credit_to
  -- COR (period flow)
  v_dur_sec         numeric := 0;
  v_proxy_bytes     numeric := 0;
  v_prompt_tok      numeric := 0;
  v_compl_tok       numeric := 0;
  v_cache_tok       numeric := 0;
  v_cor_ai          numeric := 0;
  v_cor_cap         numeric := 0;
  v_cor_sum         numeric := 0;
  v_cor_rag         numeric := 0;
  v_cor_total       numeric := 0;
  v_purchased_share numeric := 0;
  v_cor_rev         numeric := 0;
  v_granted_deliv   numeric := 0;
  v_gross_profit    numeric := 0;
  v_cap_paid_bytes  numeric := 0;
  v_cap_free_bytes  numeric := 0;
  v_funnel_free_cap numeric := 0;
  v_seg_free_ll     jsonb;
  v_seg_paid_after  jsonb;
  v_seg_paid_cap    jsonb;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles WHERE is_internal = p_internal;

  -- ── PURCHASES ─────────────────────────────────────────────────────────────
  -- period (FLOW): reported cash_in/vat/purchased_cr/vat_known.
  SELECT COALESCE(sum(amount),0), COALESCE(sum(paid),0), COALESCE(sum(tax),0), COALESCE(bool_or(has_tax),false)
    INTO v_purchased_cr, v_gross, v_vat, v_vat_known
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount,
      COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0)  AS tax,
      (ct.metadata ? 'amount_tax')                       AS has_tax
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at >= p_from AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  -- cumulative-<to purchases (recognitie).
  SELECT COALESCE(sum(amount),0), COALESCE(sum(paid),0), COALESCE(sum(tax),0)
    INTO v_purchased_to, v_gross_to, v_vat_to
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount,
      COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0)  AS tax
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at < p_to
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  -- cumulative-<from purchases (recognitie-ondergrens).
  SELECT COALESCE(sum(amount),0), COALESCE(sum(paid),0), COALESCE(sum(tax),0)
    INTO v_purchased_from, v_gross_from, v_vat_from
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount,
      COALESCE((ct.metadata->>'amount_paid')::numeric,0) AS paid,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0)  AS tax
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
      AND ct.created_at < p_from
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  -- ── GRANTED (gratis toegekend) ────────────────────────────────────────────
  SELECT COALESCE(sum(amount),0) INTO v_granted_cr
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;
  SELECT COALESCE(sum(amount),0) INTO v_granted_to
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at < p_to;
  SELECT COALESCE(sum(amount),0) INTO v_granted_from
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users)
    AND ct.created_at < p_from;

  -- ── CONSUMED (per type) ───────────────────────────────────────────────────
  SELECT COALESCE(sum(amount),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_transcription'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='caption'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_summary'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='rag'),0)
    INTO v_consumed_cr, v_cons_ai, v_cons_cap, v_cons_sum, v_cons_rag
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at >= p_from AND ct.created_at < p_to;
  SELECT COALESCE(sum(amount),0) INTO v_consumed_to
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at < p_to;
  SELECT COALESCE(sum(amount),0) INTO v_consumed_from
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users)
    AND ct.created_at < p_from;

  -- Balans (gezaghebbend, STOCK — actuele stand).
  SELECT COALESCE(sum(credits),0) INTO v_balance_cr
  FROM public.user_credits WHERE user_id = ANY(users);

  -- ── COR (PERIODE-flow, per usage-event-tijdstip) ──────────────────────────
  -- ai_transcription: gemeten AssemblyAI-minuten + Decodo-egress uit completed jobs; cache-hits COR=0.
  SELECT COALESCE(sum(duration_seconds),0), COALESCE(sum(proxy_bytes),0)
    INTO v_dur_sec, v_proxy_bytes
  FROM public.transcription_jobs
  WHERE status='complete' AND cache_hit = false AND user_id = ANY(users)
    AND created_at >= p_from AND created_at < p_to;
  v_cor_ai := (v_dur_sec/60.0)*cfg.assemblyai_eur_per_min + (v_proxy_bytes/1e9)*cfg.decodo_eur_per_gb;

  -- ai_summary: gemeten DeepSeek-tokens (attributie op transcripts.created_at — regenerate overschrijft tokens, caveat).
  SELECT COALESCE(sum((ai_summary_usage->>'prompt_tokens')::numeric),0),
         COALESCE(sum((ai_summary_usage->>'completion_tokens')::numeric),0),
         COALESCE(sum(COALESCE((ai_summary_usage->>'prompt_cache_hit_tokens')::numeric,0)),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.transcripts
  WHERE ai_summary_usage IS NOT NULL AND user_id = ANY(users)
    AND created_at >= p_from AND created_at < p_to;
  v_cor_sum := (GREATEST(v_prompt_tok - v_cache_tok,0)/1000.0)*cfg.deepseek_eur_per_1k_input_tokens
             + (v_cache_tok/1000.0)*cfg.deepseek_eur_per_1k_cache_hit_tokens
             + (v_compl_tok/1000.0)*cfg.deepseek_eur_per_1k_output_tokens;

  -- caption-COR = gemeten egress van BETAALDE captions (credits_used>0); gratis ingelogd = free-funnel-OPEX.
  SELECT COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used > 0), 0),
         COALESCE(sum(proxy_bytes) FILTER (WHERE credits_used = 0), 0)
    INTO v_cap_paid_bytes, v_cap_free_bytes
  FROM public.usage_logs
  WHERE extraction_type='caption' AND success AND is_internal_at_time = p_internal
    AND created_at >= p_from AND created_at < p_to;
  v_cor_cap         := (v_cap_paid_bytes/1e9) * cfg.decodo_eur_per_gb;
  v_funnel_free_cap := (v_cap_free_bytes/1e9) * cfg.decodo_eur_per_gb;

  v_cor_rag   := 0;
  v_cor_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag;

  -- ── REVENUE-RECOGNITIE ────────────────────────────────────────────────────
  -- per_credit + cons_purchased cumulatief op beide grenzen; recognized = periode-flow (cum_to - cum_from).
  v_per_credit_to   := CASE WHEN v_purchased_to   > 0 THEN (v_gross_to  - v_vat_to)  / v_purchased_to   ELSE 0 END;
  v_per_credit_from := CASE WHEN v_purchased_from > 0 THEN (v_gross_from- v_vat_from)/ v_purchased_from ELSE 0 END;
  v_cons_purch_to   := LEAST(v_purchased_to,   GREATEST(0, v_consumed_to   - v_granted_to));
  v_cons_purch_from := LEAST(v_purchased_from, GREATEST(0, v_consumed_from - v_granted_from));
  v_recognized_to   := v_cons_purch_to   * v_per_credit_to;
  v_recognized_from := v_cons_purch_from * v_per_credit_from;
  v_recognized      := v_recognized_to - v_recognized_from;                       -- periode delivered
  v_deferred        := (v_purchased_to - v_cons_purch_to) * v_per_credit_to;      -- stock as-of to
  v_per_credit_net  := v_per_credit_to;

  -- COR-splitsing: purchased-deel = COR tegen omzet; granted-deel = acquisitiekost (OPEX). Aandeel cumulatief.
  v_purchased_share := CASE WHEN v_consumed_to > 0 THEN v_cons_purch_to / v_consumed_to ELSE 0 END;
  v_cor_rev       := v_cor_total * v_purchased_share;
  v_granted_deliv := v_cor_total * (1 - v_purchased_share);
  v_gross_profit  := v_recognized - v_cor_rev;

  -- caption free->paid segmenten (FLOW).
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_free_ll FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=false
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_paid_after FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used=0 AND had_paid_at_time=true
     AND created_at >= p_from AND created_at < p_to;
  SELECT jsonb_build_object('count', count(*), 'bytes', COALESCE(sum(proxy_bytes),0))
    INTO v_seg_paid_cap FROM public.usage_logs
   WHERE extraction_type='caption' AND is_internal_at_time=p_internal AND credits_used>0
     AND created_at >= p_from AND created_at < p_to;

  RETURN jsonb_build_object(
    'cash_in_gross', round(v_gross,2),
    'vat', round(v_vat,2),
    'vat_known', v_vat_known,
    'revenue_net', round(v_gross - v_vat,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit_net,4),
    'consumed_purchased_cr', v_cons_purch_to,
    'recognized_revenue', round(v_recognized,2),
    'deferred_revenue', round(v_deferred,2),
    'consumed_by_type', jsonb_build_object(
      'ai_transcription', v_cons_ai, 'caption', v_cons_cap, 'ai_summary', v_cons_sum, 'rag', v_cons_rag),
    'cor', jsonb_build_object(
      'ai_transcription', round(v_cor_ai,4),
      'caption', round(v_cor_cap,4),
      'ai_summary', round(v_cor_sum,4),
      'rag', round(v_cor_rag,4),
      'total', round(v_cor_total,4)),
    'cor_caption_estimated', false,
    'cor_against_revenue', round(v_cor_rev,4),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'funnel_free_caption_cost', round(v_funnel_free_cap,4),
    'caption_segments', jsonb_build_object(
      'free_loggedin', v_seg_free_ll,
      'paid_after',    v_seg_paid_after,
      'paid_caption',  v_seg_paid_cap),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END
  );
END;
$function$;

-- ACL herstellen op de nieuwe signatuur.
REVOKE ALL     ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._geld_scope(boolean, timestamptz, timestamptz) FROM anon, authenticated;
