-- ETAPPE 1 (GELD) — Beslissing #4: OPEX-TABEL (los van cost_config)
-- cost_config blijft een TARIEF/RATE-tabel (decodo €/GB, assemblyai €/min, infra €80/maand).
-- opex_expenses = losse, periodieke UITGAVEN (ads/marketing + overige opex) — de CAC-basis voor
-- etappe 2. OPEX-keten in het dashboard = infra €80 (cost_config) + ads (opex_expenses)
--   + gratis-caption-funnelkost (daily_cost_counters × decodo, alleen externe users).

CREATE TABLE IF NOT EXISTS public.opex_expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period     date NOT NULL,                 -- maand-anker (bijv. 2026-07-01) of exacte uitgaafdatum
  category   text NOT NULL,                 -- 'ads' | 'marketing' | 'tooling' | 'infra_extra' | 'other'
  channel    text,                          -- optioneel: 'google_ads' | 'reddit' | 'meta' | ...
  eur        numeric(12,2) NOT NULL CHECK (eur >= 0),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opex_expenses_period_idx ON public.opex_expenses (period);

-- RLS: alleen de service_role (Python backend / admin server-side) mag lezen/schrijven.
-- Geen policies voor authenticated/anon => normale users zien niets.
ALTER TABLE public.opex_expenses ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.opex_expenses IS
  'Losse operationele uitgaven (ads/marketing + overige opex). Los van cost_config (tarieven). CAC-basis etappe 2 (ETAPPE 1 GELD, beslissing #4).';
