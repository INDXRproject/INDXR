-- Gratis "vergelijk de eerste minuut" (akkoord Khidr 12-11, product-gaps gat 2 stap 4).
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS preview_ai_segments jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preview_compare_seen boolean DEFAULT false NOT NULL;

-- Cache per video_id zodat een tweede gebruiker met dezelfde video geen nieuwe AssemblyAI-call
-- + proxy-egress kost. Backend-only (service-role bypasst RLS) — RLS aan, geen policies.
CREATE TABLE IF NOT EXISTS public.preview_comparisons (
  video_id text PRIMARY KEY,
  ai_segments jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.preview_comparisons ENABLE ROW LEVEL SECURITY;
