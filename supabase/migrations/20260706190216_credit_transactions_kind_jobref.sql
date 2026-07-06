-- Reserveerings-fundering (ADR-050): kind-classificatie + job/playlist-referenties
-- + idempotentie-dragers. Additief, non-breaking:
--   * kind/job_id/playlist_id NULLABLE -> bestaande INSERT-paden (RPC's zetten geen kind)
--     blijven werken; CHECK staat NULL expliciet toe.
--   * partiële UNIQUE-indexen dekken 0 legacy-rijen (job_id/playlist_id blijven NULL)
--     -> geen collision, geen impact tot nieuwe code deze kolommen samen met kind vult.

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS playlist_id uuid;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_kind_check
  CHECK (kind IS NULL OR kind IN
    ('reservation','settlement','refund','purchase','grant','bonus'));

-- Backfill kind. Read-only geverifieerd vlak vóór apply (2026-07-06):
--   1003 settlement (alle debits) / 13 grant / 9 refund / 4 bonus / 0 NULL-fallthrough.
--   0 purchase (nog geen Stripe-verkopen pre-launch; kind bestaat voor toekomst).
-- job_id/playlist_id-KOLOMMEN worden bewust NIET gebackfilled uit metadata: dat zou
-- legacy-rijen in de UNIQUE-indexen trekken met collision-risico. Blijven NULL.
UPDATE public.credit_transactions SET kind = CASE
  WHEN type='debit' THEN 'settlement'
  WHEN type='credit' AND (reason ILIKE 'Refund:%' OR reason ILIKE 'whisper_timeout%') THEN 'refund'
  WHEN type='credit' AND (reason ILIKE '%welcome%' OR reason ILIKE '%bonus%' OR reason ILIKE '%bug%') THEN 'bonus'
  WHEN type='credit' AND (reason ILIKE '%purchase%' OR reason ILIKE '%stripe%' OR reason ILIKE '%pakket%' OR reason ILIKE '%package%') THEN 'purchase'
  WHEN type='credit' THEN 'grant'
END
WHERE kind IS NULL;

-- Idempotentie-drager voor whisper/standalone settlement (job_id-gesleuteld).
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_job_kind_uidx
  ON public.credit_transactions (job_id, kind)
  WHERE job_id IS NOT NULL;

-- Idempotentie-drager voor playlist-reservering (playlist_id-gesleuteld). Symmetrisch
-- toegevoegd (nu 0 rijen) zodat de gedragsfase geen extra migratie nodig heeft.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_playlist_kind_uidx
  ON public.credit_transactions (playlist_id, kind)
  WHERE playlist_id IS NOT NULL;
