-- Make the provider (AssemblyAI) language the source of truth for transcripts.language and store the
-- provider confidence WITH the transcript, not only on the job row. See transcription_pipeline.py.
--
-- transcripts.language stays NULLABLE (it always was; a code comment wrongly said NOT NULL).

-- 1) Confidence columns on the transcript (nullable — captions and old rows have none).
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS transcript_confidence numeric,
  ADD COLUMN IF NOT EXISTS language_confidence numeric;

-- 2) Backfill language from the provider value stored on the job row, ONLY where the transcript has
--    no language yet — never overwrite an existing value. Provider codes are ISO-639-1 two-letter;
--    lower() + strip any region suffix ('en-GB'/'en_US' -> 'en') to match normalize_language_code.
UPDATE public.transcripts t
SET language = lower(split_part(split_part(j.assemblyai_language, '-', 1), '_', 1))
FROM public.transcription_jobs j
WHERE j.transcript_id = t.id
  AND t.language IS NULL
  AND j.assemblyai_language IS NOT NULL
  AND btrim(j.assemblyai_language) <> '';

-- 3) Backfill the provider confidences onto the transcript where the job captured them.
UPDATE public.transcripts t
SET transcript_confidence = COALESCE(t.transcript_confidence, j.transcript_confidence),
    language_confidence   = COALESCE(t.language_confidence, j.language_confidence)
FROM public.transcription_jobs j
WHERE j.transcript_id = t.id
  AND (j.transcript_confidence IS NOT NULL OR j.language_confidence IS NOT NULL)
  AND t.transcript_confidence IS NULL
  AND t.language_confidence IS NULL;
