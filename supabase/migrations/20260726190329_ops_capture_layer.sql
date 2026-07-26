-- Toegepast via Supabase MCP apply_migration (version 20260726190329) — repo-sync.
--
-- Operations capture-laag (fundament voor het Operations-dashboard, deel 1-5).
-- Puur additief + config + backfill. GEEN geld: bedragen worden elders (finance-RPC) gelezen, niet hier.
-- Job-niveau en unit-niveau blijven apart; deze kolommen leggen alleen gedrag/betrouwbaarheid vast.

CREATE TABLE IF NOT EXISTS public.ops_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_config ENABLE ROW LEVEL SECURITY;
-- Geen policies -> alleen service_role (ops-RPC leest via DEFINER). Zelfde patroon als finance_settings/cost_config.
COMMENT ON TABLE public.ops_config IS
  'Operationele config (drempels, limieten). Los van finance_settings zodat ops en finance niet verstrengelen.';

-- AssemblyAI concurrency-limiet: 200, GEDEELDE pool over alle pre-recorded modellen (Universal-3.5 Pro,
-- Universal-3 Pro, Universal-2 samen), GLOBAAL (niet per regio; EU-endpoint heeft geen eigen 200).
-- Excess wordt automatisch gequeued (geen fout). Bron: assemblyai.com/docs/pre-recorded-audio/concurrency.
INSERT INTO public.ops_config (key, value) VALUES
  ('assemblyai_concurrency_limit', '200'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS submitted_at           timestamptz,
  ADD COLUMN IF NOT EXISTS provider_processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_processing_ms integer,
  ADD COLUMN IF NOT EXISTS assemblyai_language    text,
  ADD COLUMN IF NOT EXISTS origin                 text;

COMMENT ON COLUMN public.transcription_jobs.submitted_at IS 'Deel 3/5: moment van aanbieden aan AssemblyAI (queue-wachttijd = provider_processing_at - submitted_at).';
COMMENT ON COLUMN public.transcription_jobs.provider_processing_at IS 'Deel 5a: eerste queued->processing overgang bij AssemblyAI (vereist submit()+poll).';
COMMENT ON COLUMN public.transcription_jobs.provider_processing_ms IS 'Deel 3: AssemblyAI-only verwerkingsduur (fasesplitsing doorlooptijd).';
COMMENT ON COLUMN public.transcription_jobs.assemblyai_language IS '5b: AssemblyAI-router taaldetectie (bepaalt Universal-3.5 Pro vs Universal-2). Los van lokale lingua-detectie.';
COMMENT ON COLUMN public.transcription_jobs.origin IS 'Deel 4: herkomst van de job (bv. error_card_ai). Backend-veld klaar; frontend koppelt later expliciet i.p.v. afgeleid.';

ALTER TABLE public.playlist_extraction_jobs
  ADD COLUMN IF NOT EXISTS parent_playlist_id uuid REFERENCES public.playlist_extraction_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_round        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_pass_failed  integer;

COMMENT ON COLUMN public.playlist_extraction_jobs.parent_playlist_id IS 'B: verwijst naar de originele playlist-job bij een manuele Retry-all (lineage voor ronde-telling).';
COMMENT ON COLUMN public.playlist_extraction_jobs.retry_round IS 'B: 0=origineel, N=N-de manuele Retry-all-ronde. Eén ronde = één Retry-all-actie.';
COMMENT ON COLUMN public.playlist_extraction_jobs.first_pass_failed IS 'Deel 3: snapshot van #mislukte videos vlak voor de automatische retry-pass -> raw first-pass.';

-- Backfill source_kind (215 NULL-rijen; forward is al gestempeld). Ambigu -> unknown, NIET single.
UPDATE public.transcription_jobs
SET source_kind = CASE
  WHEN playlist_id IS NOT NULL                             THEN 'playlist'
  WHEN video_url IS NOT NULL                               THEN 'single'
  WHEN video_url IS NULL AND COALESCE(file_size_bytes,0)>0 THEN 'upload'
  ELSE 'unknown'
END
WHERE source_kind IS NULL;
