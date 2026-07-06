-- Reserveerings-fundering (ADR-050): dragers voor het gereserveerde bedrag + refund.
-- Nullable, default 0, nu ongebruikt door code -> geen gedragswijziging.
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS credits_reserved integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_refunded integer DEFAULT 0;

ALTER TABLE public.playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS credits_reserved integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_refunded integer DEFAULT 0;
