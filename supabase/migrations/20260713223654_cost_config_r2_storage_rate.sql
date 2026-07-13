-- BLOK E — R2 storage-tarief in cost_config. Cloudflare R2: $0,015 per GB per maand opslag,
-- eerste 10 GB/maand GRATIS, egress ALTIJD €0 (R2 heeft geen egress-kosten). Storage wordt een
-- eigen COR-regel: max(0, GB - 10) × $0,015 × usd_eur_rate. Nu ~€0 (<10 GB), maar correct +
-- future-proof zonder deploy (config-rij-update).
ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS r2_usd_per_gb_month numeric(12,6),
  ADD COLUMN IF NOT EXISTS r2_free_gb          numeric(12,4);

COMMENT ON COLUMN public.cost_config.r2_usd_per_gb_month IS
  'Cloudflare R2 opslag-tarief in USD per GB per maand (bewust USD: storage-COR = max(0,GB-r2_free_gb)*r2_usd_per_gb_month*usd_eur_rate). Egress bij R2 is altijd $0.';
COMMENT ON COLUMN public.cost_config.r2_free_gb IS
  'R2 gratis opslag-drempel (GB/maand). Account-globaal → storage-COR is één globale regel, niet per-scope.';

UPDATE public.cost_config
SET r2_usd_per_gb_month = 0.015000,
    r2_free_gb          = 10.0000,
    notes = notes || ' | 2026-07-14 (Blok E) R2 storage: $0,015/GB/mnd, eerste 10 GB gratis, '
                   || 'egress altijd $0. Storage-COR = max(0,GB-10)*0,015*usd_eur_rate (nu ~€0, <10 GB).'
WHERE effective_from = (SELECT MAX(effective_from) FROM public.cost_config);
