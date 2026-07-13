-- ETAPPE 1 (GELD) — money-model RPC (single auditable bron voor het dashboard).
-- Sluit interne accounts uit (beslissing #2). Revenue = purchased-only, granted-first
-- toewijzing (beslissing #3). COR per product_type uit job-tabellen (beslissing #1).
-- OPEX = infra (cost_config) + ads (opex_expenses) + gratis-caption-funnel + granted-delivery
-- (kost van verbruikte GRATIS/granted credits = acquisitiekost, geen COR).
--
-- Alle bedragen in EUR. Financieel-kritiek: één plek, herleidbaar.

-- Per-scope helper (p_internal=false => echte economie; true => intern/test).
CREATE OR REPLACE FUNCTION public._geld_scope(p_internal boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg               public.cost_config%ROWTYPE;
  users             uuid[];
  v_purchased_cr    numeric := 0;
  v_gross           numeric := 0;
  v_vat             numeric := 0;
  v_vat_known       boolean := false;
  v_granted_cr      numeric := 0;
  v_consumed_cr     numeric := 0;
  v_balance_cr      numeric := 0;
  v_cons_ai         numeric := 0;
  v_cons_cap        numeric := 0;
  v_cons_sum        numeric := 0;
  v_cons_rag        numeric := 0;
  v_dur_sec         numeric := 0;
  v_proxy_bytes     numeric := 0;
  v_prompt_tok      numeric := 0;
  v_compl_tok       numeric := 0;
  v_cache_tok       numeric := 0;
  v_avg_cap_cost    numeric := 0;
  v_cor_ai          numeric := 0;
  v_cor_cap         numeric := 0;
  v_cor_sum         numeric := 0;
  v_cor_rag         numeric := 0;
  v_cor_total       numeric := 0;
  v_net             numeric := 0;
  v_per_credit      numeric := 0;
  v_cons_purchased  numeric := 0;
  v_recognized      numeric := 0;
  v_deferred        numeric := 0;
  v_purchased_share numeric := 0;
  v_cor_rev         numeric := 0;
  v_granted_deliv   numeric := 0;
  v_gross_profit    numeric := 0;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO users
  FROM public.profiles WHERE is_internal = p_internal;

  -- Cash in: DISTINCT stripe-session (dedup dubbel-gelogde rijen), gross + VAT.
  SELECT COALESCE(sum(amount),0), COALESCE(sum(paid),0), COALESCE(sum(tax),0), COALESCE(bool_or(has_tax),false)
    INTO v_purchased_cr, v_gross, v_vat, v_vat_known
  FROM (
    SELECT DISTINCT ON (ct.metadata->>'stripe_session_id')
      ct.amount,
      COALESCE((ct.metadata->>'amount_paid')::numeric,0)                    AS paid,
      COALESCE((ct.metadata->>'amount_tax')::numeric,0)                     AS tax,
      (ct.metadata ? 'amount_tax')                                          AS has_tax
    FROM public.credit_transactions ct
    WHERE ct.type='credit' AND ct.metadata ? 'stripe_session_id' AND ct.user_id = ANY(users)
    ORDER BY ct.metadata->>'stripe_session_id', ct.created_at
  ) s;

  -- Granted (gratis toegekend): credit zonder stripe-session, geen refund.
  SELECT COALESCE(sum(amount),0) INTO v_granted_cr
  FROM public.credit_transactions ct
  WHERE ct.type='credit' AND NOT (ct.metadata ? 'stripe_session_id')
    AND (ct.kind IS NULL OR ct.kind <> 'refund') AND ct.user_id = ANY(users);

  -- Verbruik totaal + per product_type.
  SELECT COALESCE(sum(amount),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_transcription'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='caption'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='ai_summary'),0),
         COALESCE(sum(amount) FILTER (WHERE product_type='rag'),0)
    INTO v_consumed_cr, v_cons_ai, v_cons_cap, v_cons_sum, v_cons_rag
  FROM public.credit_transactions ct
  WHERE ct.type='debit' AND ct.product_type IS NOT NULL AND ct.user_id = ANY(users);

  -- Balans (gezaghebbend).
  SELECT COALESCE(sum(credits),0) INTO v_balance_cr
  FROM public.user_credits WHERE user_id = ANY(users);

  -- COR ai_transcription: gemeten AssemblyAI-minuten + Decodo-egress uit completed jobs.
  SELECT COALESCE(sum(duration_seconds),0), COALESCE(sum(proxy_bytes),0)
    INTO v_dur_sec, v_proxy_bytes
  FROM public.transcription_jobs WHERE status='complete' AND user_id = ANY(users);
  v_cor_ai := (v_dur_sec/60.0)*cfg.assemblyai_eur_per_min + (v_proxy_bytes/1e9)*cfg.decodo_eur_per_gb;

  -- COR ai_summary: gemeten DeepSeek-tokens (cache-hit apart indien gelogd).
  SELECT COALESCE(sum((ai_summary_usage->>'prompt_tokens')::numeric),0),
         COALESCE(sum((ai_summary_usage->>'completion_tokens')::numeric),0),
         COALESCE(sum(COALESCE((ai_summary_usage->>'prompt_cache_hit_tokens')::numeric,0)),0)
    INTO v_prompt_tok, v_compl_tok, v_cache_tok
  FROM public.transcripts WHERE ai_summary_usage IS NOT NULL AND user_id = ANY(users);
  v_cor_sum := (GREATEST(v_prompt_tok - v_cache_tok,0)/1000.0)*cfg.deepseek_eur_per_1k_input_tokens
             + (v_cache_tok/1000.0)*cfg.deepseek_eur_per_1k_cache_hit_tokens
             + (v_compl_tok/1000.0)*cfg.deepseek_eur_per_1k_output_tokens;

  -- COR caption (GESCHAT): playlist-caption egress wordt niet per-video gemeten.
  -- Schatting = verbruikte caption-credits × gem. egress-kost/caption uit de dagteller.
  SELECT CASE WHEN COALESCE(sum(caption_count),0) > 0
              THEN (sum(caption_proxy_bytes)::numeric / sum(caption_count) / 1e9) * cfg.decodo_eur_per_gb
              ELSE 0 END
    INTO v_avg_cap_cost FROM public.daily_cost_counters;
  v_cor_cap := v_cons_cap * v_avg_cap_cost;

  v_cor_rag   := 0;  -- RAG = pure JSON-generatie, geen externe API-kost.
  v_cor_total := v_cor_ai + v_cor_cap + v_cor_sum + v_cor_rag;

  -- Revenue-recognitie: purchased-only, granted-first (gratis credits eerst verbruikt).
  v_net        := v_gross - v_vat;
  v_per_credit := CASE WHEN v_purchased_cr > 0 THEN v_net / v_purchased_cr ELSE 0 END;
  v_cons_purchased := LEAST(v_purchased_cr, GREATEST(0, v_consumed_cr - v_granted_cr));
  v_recognized := v_cons_purchased * v_per_credit;
  v_deferred   := (v_purchased_cr - v_cons_purchased) * v_per_credit;

  -- COR-splitsing: alleen het purchased-deel van het verbruik telt als COR tegen omzet;
  -- het granted-deel = acquisitiekost (OPEX).
  v_purchased_share := CASE WHEN v_consumed_cr > 0 THEN v_cons_purchased / v_consumed_cr ELSE 0 END;
  v_cor_rev       := v_cor_total * v_purchased_share;
  v_granted_deliv := v_cor_total * (1 - v_purchased_share);

  v_gross_profit := v_recognized - v_cor_rev;

  RETURN jsonb_build_object(
    'cash_in_gross', round(v_gross,2),
    'vat', round(v_vat,2),
    'vat_known', v_vat_known,
    'revenue_net', round(v_net,2),
    'purchased_cr', v_purchased_cr,
    'granted_cr', v_granted_cr,
    'consumed_cr', v_consumed_cr,
    'balance_cr', v_balance_cr,
    'per_credit_net', round(v_per_credit,4),
    'consumed_purchased_cr', v_cons_purchased,
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
    'cor_caption_estimated', true,
    'cor_against_revenue', round(v_cor_rev,4),
    'granted_delivery_cost', round(v_granted_deliv,4),
    'gross_profit', round(v_gross_profit,2),
    'gross_margin', CASE WHEN v_recognized > 0 THEN round(v_gross_profit / v_recognized,4) ELSE NULL END
  );
END;
$function$;

-- Hoofd-RPC: beide scopes + tarieven + globale OPEX-inputs + tellingen.
CREATE OR REPLACE FUNCTION public.admin_geld_summary()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  cfg              public.cost_config%ROWTYPE;
  v_funnel_bytes   numeric := 0;
  v_funnel_count   integer := 0;
  v_funnel_cost    numeric := 0;
  v_ads            numeric := 0;
  v_ext_profiles   integer := 0;
  v_int_profiles   integer := 0;
BEGIN
  SELECT * INTO cfg FROM public.cost_config ORDER BY effective_from DESC LIMIT 1;

  -- Gratis-caption-funnel (0-credit standalone captions): dagteller-egress × Decodo.
  -- Aggregaat: geen interne/externe split mogelijk op de dagteller (gerapporteerd als globaal).
  SELECT COALESCE(sum(caption_proxy_bytes),0), COALESCE(sum(caption_count),0)
    INTO v_funnel_bytes, v_funnel_count FROM public.daily_cost_counters;
  v_funnel_cost := (v_funnel_bytes/1e9) * cfg.decodo_eur_per_gb;

  -- Ads/marketing lopende maand uit opex_expenses.
  SELECT COALESCE(sum(eur),0) INTO v_ads FROM public.opex_expenses
   WHERE category IN ('ads','marketing');

  SELECT count(*) FILTER (WHERE NOT is_internal), count(*) FILTER (WHERE is_internal)
    INTO v_ext_profiles, v_int_profiles FROM public.profiles;

  RETURN jsonb_build_object(
    'rates', jsonb_build_object(
      'decodo_eur_per_gb', cfg.decodo_eur_per_gb,
      'assemblyai_eur_per_min', cfg.assemblyai_eur_per_min,
      'fixed_monthly_infra_eur', cfg.fixed_monthly_infra_eur),
    'counts', jsonb_build_object(
      'external_profiles', v_ext_profiles,
      'internal_profiles', v_int_profiles),
    'opex_global', jsonb_build_object(
      'infra_monthly', cfg.fixed_monthly_infra_eur,
      'ads', round(v_ads,2),
      'funnel_free_captions', round(v_funnel_cost,4),
      'funnel_caption_count', v_funnel_count,
      'funnel_estimated', true),
    'external', public._geld_scope(false),
    'internal', public._geld_scope(true)
  );
END;
$function$;

-- ACL: alleen service_role (admin server-side via createAdminClient).
REVOKE ALL ON FUNCTION public._geld_scope(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_geld_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_geld_summary() TO service_role;
