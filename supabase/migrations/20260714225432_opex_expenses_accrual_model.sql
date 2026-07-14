-- DEEL C — accrual-kostenmodel op opex_expenses. Één rij = één REEKS met levensduur
-- [effective_from, effective_to] (effective_to NULL = lopend). Het occurrence-venster wordt DAARUIT
-- afgeleid, niet apart ingevoerd. Bestaande kolommen (period/eur/category/channel/note) blijven staan
-- (admin_geld_summary leest nog sum(eur)); nieuwe kolommen zijn additief.

ALTER TABLE public.opex_expenses
  ADD COLUMN IF NOT EXISTS amount        numeric,
  ADD COLUMN IF NOT EXISTS spread        text CHECK (spread IN ('evenly','single')),
  ADD COLUMN IF NOT EXISTS recurrence    text CHECK (recurrence IN ('none','monthly')),
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to   date,
  ADD COLUMN IF NOT EXISTS description    text;

-- Bestaande rijen migreren naar het reeks-model: éénmalige single-dag-kost op period.
UPDATE public.opex_expenses
   SET amount         = COALESCE(amount, eur),
       spread         = COALESCE(spread, 'single'),
       recurrence     = COALESCE(recurrence, 'none'),
       effective_from = COALESCE(effective_from, period),
       effective_to   = COALESCE(effective_to, period),
       description    = COALESCE(description, note)
 WHERE amount IS NULL OR spread IS NULL OR recurrence IS NULL OR effective_from IS NULL;

-- Vanaf nu dragen nieuwe rijen altijd het reeks-model.
ALTER TABLE public.opex_expenses
  ALTER COLUMN amount SET DEFAULT 0,
  ALTER COLUMN spread SET DEFAULT 'single',
  ALTER COLUMN recurrence SET DEFAULT 'none';

COMMENT ON COLUMN public.opex_expenses.amount IS 'Bedrag van de reeks-occurrence (EUR). monthly: per maand; none: het volledige eenmalige bedrag.';
COMMENT ON COLUMN public.opex_expenses.spread IS 'evenly = gelijkmatig over de occurrence-dagen; single = valt volledig op de ankerdag.';
COMMENT ON COLUMN public.opex_expenses.recurrence IS 'none = één occurrence [effective_from,effective_to]; monthly = één occurrence per kalendermaand.';
COMMENT ON COLUMN public.opex_expenses.effective_from IS 'Reeks-start (occurrence-ondergrens).';
COMMENT ON COLUMN public.opex_expenses.effective_to IS 'Reeks-einde (NULL = lopend). Prijswijziging = oude reeks afsluiten + nieuwe reeks starten (geen retro-edit).';
