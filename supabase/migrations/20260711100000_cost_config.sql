-- cost_config: single runtime source of truth for unit cost rates + fixed infra.
-- Goal: kost = usage × tarief becomes a simple join/multiply, and rates can change
-- WITHOUT a code deploy. Historical rates preserved via effective_from (pick the row
-- whose effective_from <= job.created_at, latest wins → historical job costs stay correct).
--
-- Currency decision: we store EUR (the business/settlement currency; pricing is EUR-inclusive
-- per ADR-052). Source rates are quoted in USD; converted at seed using usd_eur_rate and the
-- assumption is recorded in `notes` + the usd_eur_rate column so the conversion is reconstructable.
-- Service-role only: RLS enabled with NO policies → the anon/authenticated roles see nothing;
-- the Python backend (service_role) bypasses RLS to read the current rate.

CREATE TABLE IF NOT EXISTS public.cost_config (
    id                                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_from                     timestamptz NOT NULL DEFAULT now(),
    currency                           text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
    -- unit rates (all EUR)
    decodo_eur_per_gb                  numeric(12,6) NOT NULL,
    assemblyai_eur_per_min             numeric(12,6) NOT NULL,
    deepseek_eur_per_1k_input_tokens   numeric(12,6) NOT NULL,
    deepseek_eur_per_1k_output_tokens  numeric(12,6) NOT NULL,
    -- fixed cost
    fixed_monthly_infra_eur            numeric(12,2) NOT NULL,
    -- provenance
    usd_eur_rate                       numeric(8,4),   -- FX used to convert the seeded USD source rates
    notes                              text,
    created_at                         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cost_config IS
    'Runtime unit-cost rate table (EUR). Latest effective_from <= t wins. Edit rows to change rates without a deploy.';

CREATE INDEX IF NOT EXISTS cost_config_effective_from_idx
    ON public.cost_config (effective_from DESC);

ALTER TABLE public.cost_config ENABLE ROW LEVEL SECURITY;
-- No policies on purpose → only service_role (which bypasses RLS) can read/write.

-- Seed with the current documented rates (docs/wiki/business/unit-economics.md) converted to EUR.
-- USD→EUR @ 0.92 (documented assumption). AssemblyAI $0.21/hr = $0.0035/min. Decodo $3.25/GB.
-- DeepSeek: deepseek-chat (V3) standard published pricing, input $0.27/1M + output $1.10/1M
--   (cache-miss) — INFORMATIONAL ONLY (summaries are billed flat 3 credits). VERIFY & UPDATE.
INSERT INTO public.cost_config (
    decodo_eur_per_gb,
    assemblyai_eur_per_min,
    deepseek_eur_per_1k_input_tokens,
    deepseek_eur_per_1k_output_tokens,
    fixed_monthly_infra_eur,
    usd_eur_rate,
    notes
) VALUES (
    2.990000,     -- $3.25/GB × 0.92
    0.003220,     -- $0.0035/min × 0.92
    0.000248,     -- $0.00027/1k input × 0.92  (VERIFY: DeepSeek V3 input rate)
    0.001012,     -- $0.0011/1k output × 0.92  (VERIFY: DeepSeek V3 output rate)
    80.00,        -- vaste infra ~€70-90/mnd (Railway + Vercel + Supabase + Upstash)
    0.9200,
    'Seed 2026-07-11 from unit-economics.md. Decodo $3.25/GB, AssemblyAI $0.21/hr=$0.0035/min, USD→EUR@0.92. DeepSeek rates INFORMATIONAL (flat 3cr billing) — verify against current DeepSeek pricing and update effective_from with a new row.'
);
