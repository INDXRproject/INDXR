-- HOTFIX (keyterms-ADR follow-up, 2026-11-12): migratie 20261111193952 voegde keyterms toe aan
-- transcription_jobs/transcripts/quick_quotes maar NIET aan playlist_extraction_jobs, terwijl
-- backend/main.py::start_playlist_extraction wél 'keyterms' in de insert-dict schrijft voor ELKE
-- playlist (ook gratis captions-only, geen hints). Gevolg: elke playlist-start gaf een 500 ("column
-- keyterms does not exist") sinds commit 7d756d0 (2026-11-11 21:06). Geen enkele playlist-job-rij is
-- aangemaakt in die periode (de insert faalt atomisch, dus geen credits gereserveerd, geen wees-job).
ALTER TABLE public.playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS keyterms text[];

COMMENT ON COLUMN public.playlist_extraction_jobs.keyterms IS
  'Spelling-hints term list voor de hele playlist-job (één lijst per job, keyterms-ADR-109). NULL/leeg = geen hints = geen add-on-COR. Doorgegeven aan elke AI-video in de job via worker.py.';
