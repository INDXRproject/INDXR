-- ADR-090: (A/B) sluit ai_summary-jobs uit van de transcriptie-COR/proxy-aggregaten (source_kind-discriminator;
-- IS DISTINCT FROM sluit NULL-legacy correct in). (C) prijs de AI-summary-COR PER MODEL: sonnet-4-6-rijen tegen
-- het sonnet-tarief, alle overige (gemini/haiku/legacy NULL) tegen het bestaande gateway-tarief. In-place op de
-- LIVE functie-body met guards (RAISE bij gemiste anchor → rollback), zoals ADR-068/070.
DO $mig$
DECLARE d text; d0 text;
BEGIN
  d := pg_get_functiondef('_geld_scope(boolean,timestamptz,timestamptz)'::regprocedure);
  d0 := d;

  d := replace(d,
    $a$WHERE status='complete' AND cache_hit = false AND user_id = ANY(users)$a$,
    $a$WHERE status='complete' AND cache_hit = false AND source_kind IS DISTINCT FROM 'ai_summary' AND user_id = ANY(users)$a$);
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 _geld_scope: anchor A (complete/cache_hit) niet gevonden'; END IF;
  d0 := d;

  d := replace(d,
    $b$WHERE status <> 'complete' AND user_id = ANY(users)$b$,
    $b$WHERE status <> 'complete' AND source_kind IS DISTINCT FROM 'ai_summary' AND user_id = ANY(users)$b$);
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 _geld_scope: anchor B (non-complete proxy) niet gevonden'; END IF;
  d0 := d;

  d := regexp_replace(d,
    $p$v_cor_sum := \(GREATEST\(v_prompt_tok.*?usd_eur_rate,1\)\);$p$,
    $r$SELECT COALESCE(sum(
      (GREATEST(prompt_tokens - cache_hit_tokens,0)/1e6)
        * CASE WHEN model LIKE 'claude-sonnet-4-6%' THEN cfg.assemblyai_llm_sonnet_usd_per_1m_input_tokens
               ELSE cfg.assemblyai_llm_usd_per_1m_input_tokens END
      + (completion_tokens/1e6)
        * CASE WHEN model LIKE 'claude-sonnet-4-6%' THEN cfg.assemblyai_llm_sonnet_usd_per_1m_output_tokens
               ELSE cfg.assemblyai_llm_usd_per_1m_output_tokens END
    ) * COALESCE(cfg.usd_eur_rate,1), 0) INTO v_cor_sum
    FROM public.ai_summary_usage_log
    WHERE user_id = ANY(users) AND generated_at >= p_from AND generated_at < p_to;$r$);
  IF d = d0 THEN RAISE EXCEPTION 'ADR-090 _geld_scope: anchor C (v_cor_sum expr) niet gevonden'; END IF;

  EXECUTE d;
END $mig$;
