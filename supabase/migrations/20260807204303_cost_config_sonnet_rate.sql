-- ADR-090: AI-summary stap 1 gebruikt claude-sonnet-4-6 (duurder dan gemini-2.5-flash). Aparte COR-tarieven
-- zodat de per-model prijzing in _geld_scope de sonnet-kost niet onder-boekt tegen het gemini-tarief.
-- Waarde = 1.1× Anthropic list ($3/$15 → $3.30/$16.50), dezelfde markup-conventie als het gemini-tarief
-- (Google list $0.30/$2.50 → geconfigureerd $0.33/$2.75). Af te stemmen op de echte gateway-factuur.
ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS assemblyai_llm_sonnet_usd_per_1m_input_tokens  numeric NOT NULL DEFAULT 3.30,
  ADD COLUMN IF NOT EXISTS assemblyai_llm_sonnet_usd_per_1m_output_tokens numeric NOT NULL DEFAULT 16.50;
