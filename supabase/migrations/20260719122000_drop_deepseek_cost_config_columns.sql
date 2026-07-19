-- ADR-068 cleanup: drop the now-dead DeepSeek cost_config columns. Verified before drop that NO
-- function/view/matview references them (the AI-summary COR rate was repointed to the AssemblyAI-LLM
-- columns in 20260719120500 / _121000, and the DeepSeek operations balance widget was removed in _121500).
-- None of these columns feed _sale_vat or revenue recognition — they were rate/monitoring only.
ALTER TABLE public.cost_config
  DROP COLUMN IF EXISTS deepseek_eur_per_1k_input_tokens,
  DROP COLUMN IF EXISTS deepseek_eur_per_1k_output_tokens,
  DROP COLUMN IF EXISTS deepseek_eur_per_1k_cache_hit_tokens,
  DROP COLUMN IF EXISTS deepseek_peak_multiplier,
  DROP COLUMN IF EXISTS deepseek_peak_windows_utc,
  DROP COLUMN IF EXISTS deepseek_low_balance_usd;
