-- Vroege snelheidsscreening bij YouTube-audio-download (ADR-095): verwachte doorvoer van een
-- NORMALE exit, als één tunbare bron in cost_config. Afgeleid uit de meetlaag (ADR-092): de mediaan
-- ligt rond 2,3 Mbit/s = 2_300_000/8 = 287_500 bytes/s. Dit is v_norm in de afgeleide vloer
-- v_floor(p) = v_norm · (1−p)/(1+p) (zie ADR-095 voor de afleiding). Her te leiden uit
-- `transcription_jobs` (proxy_bytes / (download_ms/1000)) naarmate de data groeit — daarom in
-- cost_config i.p.v. hardcoded. Puur een screening-invoer; raakt COR/omzet/VAT niet.

ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS download_normal_bytes_per_sec numeric(14,2);

UPDATE public.cost_config SET
  download_normal_bytes_per_sec = 287500,
  notes = COALESCE(notes,'') ||
    ' | 2026-08-09 ADR-095: download_normal_bytes_per_sec = 287500 B/s (=2,3 Mbit/s mediaan uit de '
    'meetlaag ADR-092). v_norm voor de vroege-screening-vloer v_floor(p)=v_norm·(1−p)/(1+p). '
    'Her te leiden uit transcription_jobs.download_ms/proxy_bytes als de dataset groeit.';
