-- Idempotentiesleutels op alle credit-reserverende POST-endpoints (ADR-019, eindelijk gebouwd).
-- Eén sleutel per logische handeling: de client munt 'm bij intentie, stuurt 'm mee, en de server geeft
-- bij een tweede verzoek met dezelfde sleutel dezelfde job terug zonder dubbel werk/dubbele reservering.
-- Vervangt de tijd-gebaseerde read-then-insert-dedup als atomische garantie; een echte retry na een
-- vastgelopen job is een nieuwe handeling met een NIEUWE sleutel en wordt niet geblokkeerd.
--
-- Ontwerpkeuze: `job_id` wordt bij het CLAIMEN meegeschreven (vooraf gegenereerd), zodat een gelijktijdig
-- tweede verzoek (dat de PK-botsing 23505 krijgt) ALTIJD een job_id ziet — geen NULL-venster.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key           text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash  text NOT NULL,               -- hash van de betekenisvolle request-velden; zelfde sleutel +
                                              -- ander hash = een clientfout (andere bedoeling), geen herhaling
  kind          text NOT NULL,               -- 'single' | 'upload' | 'playlist' | 'ai_summary'
  job_id        uuid NOT NULL,               -- de job (transcription_jobs / playlist_extraction_jobs) van deze sleutel
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_idx ON public.idempotency_keys (expires_at);

-- Alleen de Python-backend (service-role) raakt deze tabel aan. RLS aan + geen policies = dichtgezet voor
-- anon/authenticated (service-role omzeilt RLS).
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Opruimen: verwijder verlopen sleutels. Aangeroepen door een ARQ-cron (worker.py), 24u-TTL.
CREATE OR REPLACE FUNCTION public.cleanup_idempotency_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_idempotency_keys() FROM public;
REVOKE EXECUTE ON FUNCTION public.cleanup_idempotency_keys() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_idempotency_keys() TO service_role;
