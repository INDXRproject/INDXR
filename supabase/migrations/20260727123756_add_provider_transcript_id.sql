-- Toegepast via Supabase MCP apply_migration (version 20260727123756) — repo-sync.
--
-- Commit 3 (submit+poll): sla de AssemblyAI-provider-transcript-id op de EIGEN jobrij op, zodat een
-- worker-herstart de LOPENDE provider-job kan her-pollen i.p.v. opnieuw indienen (geen dubbele
-- facturering). STRAK begrensd hergebruik (verkeerde inhoud > dubbel betalen): alleen her-pollen als de
-- id op DEZE jobrij staat, de job niet terminaal is, de provider-status queued/processing is, en de
-- submission binnen AssemblyAI's bewaartermijn (1 dag) valt. Twijfel -> opnieuw indienen + loggen.
ALTER TABLE public.transcription_jobs ADD COLUMN IF NOT EXISTS provider_transcript_id text;

COMMENT ON COLUMN public.transcription_jobs.provider_transcript_id IS
  'AssemblyAI-transcript-id van de lopende provider-job. Alleen voor veilige resume-her-poll na een '
  'worker-herstart (submit+poll, commit 3). Hergebruik uitsluitend onder alle gates: zelfde jobrij, '
  'niet-terminaal, provider-status queued/processing, submitted_at binnen 1 dag. Anders opnieuw indienen.';
