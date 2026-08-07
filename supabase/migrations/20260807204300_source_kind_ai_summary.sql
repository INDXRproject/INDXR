-- ADR-090: transcription_jobs is bewust een GEDEELDE jobtabel; source_kind is de discriminator.
-- Voeg 'ai_summary' toe zodat de AI-samenvatting-achtergrondtaak een dragende jobrij kan hebben
-- (reserve/refund via de bestaande RPC's + watchdog-reconciliatie). Behoudt NULL-toestaan (NULL=ANY → NULL → CHECK passeert).
ALTER TABLE public.transcription_jobs DROP CONSTRAINT IF EXISTS transcription_jobs_source_kind_check;
ALTER TABLE public.transcription_jobs
  ADD CONSTRAINT transcription_jobs_source_kind_check
  CHECK (source_kind = ANY (ARRAY['single'::text, 'playlist'::text, 'upload'::text, 'ai_summary'::text]));
