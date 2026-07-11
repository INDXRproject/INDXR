-- Blok B: DeepSeek exacte kost per samenvatting herrekenbaar maken (cache-tier + tijd-tarief).
--
-- Probleem: kost = tokens × één opgeslagen (cache-miss) tarief is FOUT zodra DeepSeek afwijkt:
--   (a) CACHE HITS — cache-hit input-tokens kosten $0,0028/M vs cache-miss $0,14/M = 50× goedkoper.
--       De DeepSeek-response geeft de splitsing terug (usage.prompt_cache_hit_tokens /
--       prompt_cache_miss_tokens; geverifieerd tegen een echte response 2026-07-11). Zonder de
--       hit-rate op te slaan reken je elke cache-hit als volle miss = structurele overschatting.
--   (b) TIJD-TARIEF — mocht DeepSeek tijd-gebaseerde pricing activeren (piek/off-peak), dan is de
--       kost een factor anders. De response geeft GEEN bedrag en GEEN piek-vlag terug, alleen een
--       server-side UTC-timestamp (usage `created`). Daarom: multiplier + vensters in CONFIG (niet
--       hardcoded in applicatiecode), zodat de kost per samenvatting herrekenbaar is met de juiste
--       factor door de call-timestamp tegen de vensters te leggen.
--
-- Deze migratie voegt de ontbrekende cache-hit-rate + tijd-tarief-config toe. De backend logt
-- voortaan de cache-splitsing + DeepSeek-`created` in transcripts.ai_summary_usage (aparte code-wijz).
--
-- LET OP scale: bestaande rate-kolommen zijn numeric(12,6); de cache-hit-rate (€0,000002576/1k) zou
-- daar op 0,000003 afronden (~16% fout). Nieuwe kolom daarom numeric(18,10).
--
-- Officiële DeepSeek pricing-pagina (geverifieerd 2026-07-11) toont GEEN tijd-gebaseerde pricing →
-- deepseek_peak_multiplier default 1.0000 (geen op/afslag), vensters NULL. Activeert DeepSeek later
-- tijd-pricing, dan is dat één config-rij-update, geen deploy.

ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS deepseek_eur_per_1k_cache_hit_tokens numeric(18,10),
  ADD COLUMN IF NOT EXISTS deepseek_peak_multiplier numeric(6,4) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS deepseek_peak_windows_utc jsonb;

COMMENT ON COLUMN public.cost_config.deepseek_eur_per_1k_cache_hit_tokens IS
  'EUR per 1k DeepSeek input-tokens die een context-cache-HIT waren (usage.prompt_cache_hit_tokens). '
  'deepseek_eur_per_1k_input_tokens = de cache-MISS rate (prompt_cache_miss_tokens). '
  'Echte kost = hit_tokens/1000*hit_rate + miss_tokens/1000*miss_rate + completion_tokens/1000*output_rate, '
  'daarna * peak_multiplier als de call-timestamp binnen een venster valt.';
COMMENT ON COLUMN public.cost_config.deepseek_peak_multiplier IS
  'Tijd-tarief-factor (1.0 = geen tijd-pricing). Van toepassing binnen deepseek_peak_windows_utc.';
COMMENT ON COLUMN public.cost_config.deepseek_peak_windows_utc IS
  'jsonb-array van UTC-vensters [["HH:MM","HH:MM"], ...] waarbinnen peak_multiplier geldt; '
  'NULL/[] = geen vensters. Piekuren staan HIER (config), nooit hardcoded in applicatiecode.';

-- Vul de cache-hit-rate + tijd-tarief-config op de ACTIEVE (nieuwste) rij. Dit is een
-- completeness-fix (de cache-hit-prijs bestond altijd, we sloegen 'm alleen niet op), geen
-- nieuwe prijs-epoch → UPDATE op de bestaande rij i.p.v. een nieuwe effective_from-rij.
UPDATE public.cost_config
SET deepseek_eur_per_1k_cache_hit_tokens = 0.0000025760,  -- $0,0028/M ÷1000 ×0,92 EUR
    deepseek_peak_multiplier = 1.0,
    deepseek_peak_windows_utc = NULL,
    notes = notes || ' | 2026-07-11 (Blok B) cache-tier + tijd-tarief: cache-hit rate '
                   || '€0,000002576/1k toegevoegd ($0,0028/M ×0,92; miss-rate = het bestaande '
                   || 'deepseek_eur_per_1k_input_tokens). peak_multiplier=1.0, vensters NULL — '
                   || 'officiële DeepSeek pricing toont geen tijd-pricing (geverifieerd 2026-07-11); '
                   || 'geactiveerd = config-update. Backend logt nu prompt_cache_hit/miss_tokens + '
                   || 'DeepSeek-`created` (server-UTC) in ai_summary_usage → kost herrekenbaar, niet tokens×vast.'
WHERE effective_from = (SELECT MAX(effective_from) FROM public.cost_config);
