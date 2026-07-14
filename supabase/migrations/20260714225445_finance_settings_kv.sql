-- DEEL C — mini-config voor de deferred-mix (venster + per-methode overrides) en toekomstige knoppen.
-- Key/value zodat we knoppen additief kunnen toevoegen zonder migraties.
CREATE TABLE IF NOT EXISTS public.finance_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.finance_settings IS
  'Admin-instelbare Finance-knoppen (key/value). O.a. deferred_window_days (30/60/90) + per-methode kost/credit-overrides voor de "future cost to deliver"-schatting.';

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
-- Geen policies → alleen service_role (bypass) + SECURITY DEFINER-functies.

INSERT INTO public.finance_settings (key, value) VALUES
  ('deferred_window_days', '90'::jsonb),
  ('deferred_cost_overrides', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
