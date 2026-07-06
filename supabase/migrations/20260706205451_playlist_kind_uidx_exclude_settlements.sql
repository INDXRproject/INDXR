-- ADR-050 fase 2: settlements zijn MEERVOUDIG per playlist (één per betaalde video), maar
-- de bestaande (playlist_id, kind) UNIQUE stond maar één rij per kind toe. Herbouw zodat de
-- uniciteit alleen reservation/refund afdwingt (één per playlist); settlements uitgezonderd.
-- (job_id, kind) blijft ongewijzigd: whisper-settlements zijn per-video uniek via job_id.
DROP INDEX IF EXISTS public.credit_transactions_playlist_kind_uidx;
CREATE UNIQUE INDEX credit_transactions_playlist_kind_uidx
  ON public.credit_transactions (playlist_id, kind)
  WHERE playlist_id IS NOT NULL AND kind <> 'settlement';
