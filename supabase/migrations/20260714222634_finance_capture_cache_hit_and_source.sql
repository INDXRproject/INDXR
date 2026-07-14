-- B2b — cache-hit-vlag op AI-transcriptie (capturen, niet melden).
-- Master-cache-hit-job: credit_cost wél gesettled, maar COR=0 (geen AssemblyAI/proxy).
-- Forward-only; zonder deze vlag is de cache-besparing op de duurste kostenpost onzichtbaar.
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS cache_hit boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.transcription_jobs.cache_hit IS
  'True = master-cache-hit (transcript uit master_transcripts, COR=0, credits wél gesettled). False = echte AssemblyAI/proxy-run.';

-- B3 — bron-vlag (voedt Operations, niet Finance). Forward-only, geen backfill.
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS source_kind text CHECK (source_kind IN ('single','playlist','upload')),
  ADD COLUMN IF NOT EXISTS playlist_id uuid;
COMMENT ON COLUMN public.transcription_jobs.source_kind IS
  'Herkomst van de job: single (losse video), playlist (playlist-whisper), upload (bestandsupload). Bij aanmaak gezet; forward-only.';
COMMENT ON COLUMN public.transcription_jobs.playlist_id IS
  'FK-loze verwijzing naar playlist_extraction_jobs.id wanneer source_kind=playlist. NULL anders.';

-- B3 — usage_logs bron (single|playlist). Default 'single' zodat bestaande callers ongewijzigd single loggen.
ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'single' CHECK (source IN ('single','playlist'));
COMMENT ON COLUMN public.usage_logs.source IS
  'Caption-herkomst: single (losse extractie) of playlist (playlist-run). Voedt Operations, niet Finance.';
