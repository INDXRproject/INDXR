-- ADR-099: when the audio provider's language and the text detection disagree, the text wins (it is
-- what the user reads/exports) but we keep the overruled provider value so the disagreement stays
-- visible and countable. Nullable — only set when provider and text differ. See language_detection.py.
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS provider_language text;
