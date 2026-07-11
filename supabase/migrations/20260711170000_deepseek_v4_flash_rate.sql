-- Blok D: echte DeepSeek-tarieven na de model-migratie deepseek-chat → deepseek-v4-flash.
-- Bron: officiële DeepSeek pricing-pagina (geverifieerd 2026-07-11): deepseek-v4-flash cache-miss
-- input $0.14/M, output $0.28/M. Omgerekend per 1k tokens ×0.92 EUR (zelfde FX-conventie als de seed):
--   input:  $0.14/M = $0.00014/1k × 0.92 = €0.0001288/1k → 0.000129 (numeric(12,6))
--   output: $0.28/M = $0.00028/1k × 0.92 = €0.0002576/1k → 0.000258 (numeric(12,6))
-- Kost = in_tokens × input_rate + out_tokens × output_rate. Informationeel (samenvatting = flat 3cr).
-- Update de huidige (enige) cost_config-rij i.p.v. een nieuwe historie-rij: de seed-deepseek-rates
-- waren placeholders (nooit tegen echte usage gejoind), dus geen echte historie te bewaren.

UPDATE public.cost_config
SET deepseek_eur_per_1k_input_tokens  = 0.000129,
    deepseek_eur_per_1k_output_tokens = 0.000258,
    notes = notes || ' | 2026-07-11 (Blok D): DeepSeek gecorrigeerd naar deepseek-v4-flash echte pricing (input $0.14/M, output $0.28/M, officiële DeepSeek pricing) ×0.92 EUR. Model-migratie: deepseek-chat gedeprecieerd 2026-07-24.'
WHERE id = (SELECT id FROM public.cost_config ORDER BY effective_from DESC LIMIT 1);
