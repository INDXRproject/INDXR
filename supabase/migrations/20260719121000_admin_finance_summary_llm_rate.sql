-- ADR-068: admin_finance_summary exposes cost rates in its 'rates' object. Swap the three dead
-- DeepSeek rate fields for the two AssemblyAI-LLM rate fields (drop the cache-hit field — no cache
-- tier). In-place token substitution on the live body so nothing else in this large RPC can drift.
DO $do$
DECLARE src text;
BEGIN
  src := pg_get_functiondef('public.admin_finance_summary(timestamptz,timestamptz)'::regprocedure);
  src := replace(src, '''deepseek_eur_per_1k_cache_hit_tokens'', cfg.deepseek_eur_per_1k_cache_hit_tokens,', '');
  src := replace(src, '''deepseek_eur_per_1k_input_tokens'', cfg.deepseek_eur_per_1k_input_tokens',
                      '''assemblyai_llm_usd_per_1m_input_tokens'', cfg.assemblyai_llm_usd_per_1m_input_tokens');
  src := replace(src, '''deepseek_eur_per_1k_output_tokens'', cfg.deepseek_eur_per_1k_output_tokens',
                      '''assemblyai_llm_usd_per_1m_output_tokens'', cfg.assemblyai_llm_usd_per_1m_output_tokens');
  IF src LIKE '%deepseek%' THEN
    RAISE EXCEPTION 'admin_finance_summary still references deepseek after substitution — aborting';
  END IF;
  EXECUTE src;
END $do$;
