-- ADR-068: repoint AI-summary COR in _geld_scope from the (dead) DeepSeek rate to the AssemblyAI
-- EU LLM Gateway rate. Done as an in-place token substitution on the LIVE function body so nothing
-- else (revenue, _sale_vat, vat_by_country, storage, drivers, proxy_fail_bytes, the per-user
-- against-revenue share weighting) can drift. The per-1k formula structure is preserved; each DeepSeek
-- rate column is swapped for the equivalent expression built from the new USD/1M columns × usd_eur_rate:
--   (tok/1000)*(usd_per_1m/1000*fx) == tok/1e6*usd_per_1m*fx   (identical math), and the
--   cache-hit term collapses to 0 (the gateway's Gemini/Claude models have no prompt-cache tier).
DO $do$
DECLARE src text;
BEGIN
  src := pg_get_functiondef('public._geld_scope(boolean,timestamptz,timestamptz)'::regprocedure);
  src := replace(src, 'cfg.deepseek_eur_per_1k_cache_hit_tokens', '(0)');
  src := replace(src, 'cfg.deepseek_eur_per_1k_input_tokens',
                      '(cfg.assemblyai_llm_usd_per_1m_input_tokens/1000.0*COALESCE(cfg.usd_eur_rate,1))');
  src := replace(src, 'cfg.deepseek_eur_per_1k_output_tokens',
                      '(cfg.assemblyai_llm_usd_per_1m_output_tokens/1000.0*COALESCE(cfg.usd_eur_rate,1))');
  IF src LIKE '%deepseek%' THEN
    RAISE EXCEPTION '_geld_scope still references deepseek after substitution — aborting';
  END IF;
  EXECUTE src;
END $do$;
