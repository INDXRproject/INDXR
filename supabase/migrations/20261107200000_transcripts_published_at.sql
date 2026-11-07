-- Bron-/citatiekaart (2026-11-07): de uploaddatum van een YouTube-video, voor een gedateerde
-- APA-verwijzing. Nullable; gevuld bij de eerste weergave via POST /api/transcripts/[id]/published-at
-- (YouTube Data API, geen proxy-fallback). Geen view-wijziging nodig (de detailpagina leest select *).
ALTER TABLE public.transcripts ADD COLUMN IF NOT EXISTS published_at date;
