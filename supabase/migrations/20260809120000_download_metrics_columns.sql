-- Meet-instrumentatie voor trage YouTube-audio-downloads (meten, nog niet ingrijpen).
--
-- Achtergrond (onderzoek vorige sessie): trage downloads komen van de kwaliteit van het gepinde
-- Decodo-exit-IP, niet van het tegoed; er is geen doorvoerondergrens dus een trage node wordt
-- uitgezeten tot de klokdeadline; en een mislukte poging downloadt het bestand volledig opnieuw
-- (één job deed 288MB egress voor 96MB audio = 3 volledige downloads). Die her-download-kost is nu
-- onzichtbaar en drukt op de kostprijs per transcriptie.
--
-- Deze migratie voegt twee kolommen toe zodat doorvoer en her-download-versterking DIRECT
-- queryebaar zijn i.p.v. via een benadering met tijdstempels:
--   download_ms       — som van de ACTIEVE poging-download-duren (excl. retry-backoff en excl.
--                        ffmpeg-transcodering). Throughput = proxy_bytes / (download_ms/1000).
--   download_attempts — aantal daadwerkelijk gestarte download-pogingen (>1 = her-download).
--
-- Gevuld door de pipeline via extract_youtube_audio(summary_cb=...) op ELK eindpunt (succes én
-- mislukking). Forward-only: bestaande rijen blijven NULL (geen backfill — de oude data heeft geen
-- per-poging-meting). GEEN gedragswijziging aan de download (geen doorvoerondergrens, geen vroege
-- rotatie, geen wijziging aan pogingen/formaatkeuze). Her-download-versterking per job =
-- proxy_bytes (cumulatieve egress, alle pogingen) t.o.v. download_total_bytes (één volledig bestand).

ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS download_ms       integer,
  ADD COLUMN IF NOT EXISTS download_attempts integer;

COMMENT ON COLUMN public.transcription_jobs.download_ms IS
  'Som van de actieve yt-dlp download-duren over alle pogingen (ms), excl. retry-backoff en ffmpeg. Throughput = proxy_bytes / (download_ms/1000). NULL voor rijen van vóór 2026-08-09 (forward-only).';
COMMENT ON COLUMN public.transcription_jobs.download_attempts IS
  'Aantal gestarte yt-dlp download-pogingen voor deze job (>1 = her-download). Met proxy_bytes vs download_total_bytes = her-download-versterking. NULL voor rijen van vóór 2026-08-09 (forward-only).';
