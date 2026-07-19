-- ADR-068: AI-summary provider swap DeepSeek → AssemblyAI EU LLM Gateway.
-- New provider-neutral rate columns for the summary token COR. Stored in USD/1M; the FX
-- (cost_config.usd_eur_rate) is applied at query time in _geld_scope — same pattern as R2 storage COR.
-- gemini-2.5-flash EU in-region pricing: global $0.30 in / $2.50 out per 1M + 10% in-region premium
-- (we keep data in the EU → we do NOT set model_region:global) = $0.33 in / $2.75 out per 1M.
ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS assemblyai_llm_usd_per_1m_input_tokens  numeric(12,6),
  ADD COLUMN IF NOT EXISTS assemblyai_llm_usd_per_1m_output_tokens numeric(12,6);

UPDATE public.cost_config
   SET assemblyai_llm_usd_per_1m_input_tokens  = 0.33,
       assemblyai_llm_usd_per_1m_output_tokens = 2.75,
       notes = COALESCE(notes,'') ||
         ' | 2026-07-19 ADR-068: AI-summary via AssemblyAI EU LLM Gateway (gemini-2.5-flash). '
         'USD in-region 0.33 in / 2.75 out per 1M (global 0.30/2.50 + 10% EU in-region). FX via usd_eur_rate.'
 WHERE id = (SELECT id FROM public.cost_config ORDER BY effective_from DESC LIMIT 1);
