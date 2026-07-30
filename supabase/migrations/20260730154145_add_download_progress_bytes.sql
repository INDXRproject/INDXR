-- Toegepast via Supabase MCP apply_migration (version 20260730154145) — repo-sync.
--
-- Point 2: download-voortgang voor de frontend-voortgangsbalk. Rauwe bytes (geen percentage — de UI
-- toont "19.2 / 50.4 MB"). Geschreven vanuit de yt-dlp progress-hook, GETHROTTLED (de hook vuurt
-- tientallen keren/sec; we schrijven ~elke 3s, ~de frontend-poll-cadans). Ontbreekt het totaal, dan
-- blijven BEIDE leeg → de UI valt terug op een onbepaalde balk (geen gok).
ALTER TABLE public.transcription_jobs ADD COLUMN IF NOT EXISTS download_bytes bigint;
ALTER TABLE public.transcription_jobs ADD COLUMN IF NOT EXISTS download_total_bytes bigint;

COMMENT ON COLUMN public.transcription_jobs.download_bytes IS
  'Bytes gedownload tot nu toe tijdens de yt-dlp audio-download (rauw, gethrottled ~3s). NULL = onbekend.';
COMMENT ON COLUMN public.transcription_jobs.download_total_bytes IS
  'Totale downloadgrootte volgens yt-dlp (total_bytes / _estimate). NULL = yt-dlp kent het totaal niet → onbepaalde balk.';
