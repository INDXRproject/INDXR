-- Meetlaag-uitbreiding (ADR-096): snelheid (fasetijden + RTF), kwaliteit (confidence), kosten
-- (cost_eur per job), gebruik (export_events per formaat), bewerkingsgraad (transcripts.edit_ratio).
-- Strikt begrensd tot deze lijst: geen ruwe audiokenmerken, geen extra gedragsregistratie, geen
-- inhoudsanalyse. Alles forward-only (bestaande rijen NULL); raakt COR/omzet/VAT-berekening niet
-- (cost_eur is een gedenormaliseerde momentopname voor snelle marge-queries, geen nieuwe COR-bron).

-- 1) SNELHEID + KWALITEIT + KOSTEN op transcription_jobs.
--    Fasetijden vullen samen (met de bestaande download_ms) de doorlooptijd; total = processing_time_seconds.
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS compress_ms           integer,
  ADD COLUMN IF NOT EXISTS transcribe_ms         integer,
  ADD COLUMN IF NOT EXISTS save_ms               integer,
  ADD COLUMN IF NOT EXISTS transcript_confidence numeric,
  ADD COLUMN IF NOT EXISTS language_confidence   numeric,
  ADD COLUMN IF NOT EXISTS cost_eur              numeric(12,6);

COMMENT ON COLUMN public.transcription_jobs.compress_ms IS 'ADR-096: ffmpeg-transcode-duur (ruw→12kbps opus), ms. NULL vóór 2026-08-09.';
COMMENT ON COLUMN public.transcription_jobs.transcribe_ms IS 'ADR-096: provider-fase (submit→AssemblyAI completed, incl. upload+queue), ms.';
COMMENT ON COLUMN public.transcription_jobs.save_ms IS 'ADR-096: opslaan-fase (transcript-persist+finaliseren na provider-completed), ms.';
COMMENT ON COLUMN public.transcription_jobs.transcript_confidence IS 'ADR-096: AssemblyAI transcript.confidence (0-1). Kwaliteitssignaal, per taal trendbaar.';
COMMENT ON COLUMN public.transcription_jobs.language_confidence IS 'ADR-096: AssemblyAI json_response.language_confidence (0-1); NULL als niet teruggegeven.';
COMMENT ON COLUMN public.transcription_jobs.cost_eur IS 'ADR-096: gedenormaliseerde kostprijs per job (STT+diarisatie+proxy egress) uit job_cor_eur; cache_hit=0. Voor snelle marge-query, GEEN COR-bron (die blijft _geld_scope).';

-- 2) BEWERKINGSGRAAD op transcripts (grove maat, gezet bij opslaan van een bewerking; zie ADR-096).
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS edit_ratio numeric;
COMMENT ON COLUMN public.transcripts.edit_ratio IS 'ADR-096: grove bewerkingsgraad = woord-multiset-symmetrisch-verschil(bewerkt,origineel)/origineel-woorden, gezet bij edit-save. Trend per taal (hoeveel gebruikers wijzigen); reordering telt niet mee (bewust grof).';

-- 3) GEBRUIK: export_events — elke (ingelogde) export met formaat.
CREATE TABLE IF NOT EXISTS public.export_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript_id uuid,
  format        text NOT NULL,   -- txt | txt-ts | md | md-ts | json | csv | srt | vtt | rag
  source        text,            -- viewer | bulk | rag
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_events ENABLE ROW LEVEL SECURITY;
-- Ingelogde gebruiker mag alleen eigen export-events invoegen; lezen gebeurt admin-side via service-role
-- (bypasst RLS) — geen SELECT-policy voor authenticated (privacy: geen kruislezen).
DROP POLICY IF EXISTS export_events_insert_own ON public.export_events;
CREATE POLICY export_events_insert_own ON public.export_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_export_events_created ON public.export_events(created_at);
CREATE INDEX IF NOT EXISTS idx_export_events_format  ON public.export_events(format);

-- 4) KOSTEN-helper: per-job COR in EUR uit de eigen kolommen × cost_config (single-source rates:
--    dezelfde helpers als _geld_scope). STT + diarisatie-add-on + proxy-egress.
CREATE OR REPLACE FUNCTION public.job_cor_eur(p_duration_seconds integer, p_model text, p_diarization boolean, p_proxy_bytes bigint)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
  SELECT (COALESCE(p_duration_seconds,0)/60.0) * (
           public.assemblyai_stt_eur_per_min(p_model)
           + CASE WHEN COALESCE(p_diarization,false) THEN public.assemblyai_diarization_eur_per_min() ELSE 0 END
         )
       + (COALESCE(p_proxy_bytes,0)/1e9) * c.decodo_eur_per_gb
  FROM public.cost_config c ORDER BY c.effective_from DESC LIMIT 1;
$fn$;
COMMENT ON FUNCTION public.job_cor_eur(integer,text,boolean,bigint) IS 'ADR-096: per-job COR EUR (STT+diarisatie+proxy) uit cost_config; zelfde tarief-helpers als _geld_scope.';
REVOKE ALL ON FUNCTION public.job_cor_eur(integer,text,boolean,bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.job_cor_eur(integer,text,boolean,bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.job_cor_eur(integer,text,boolean,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.compute_and_store_job_cost(p_job_id uuid)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE v numeric;
BEGIN
  UPDATE public.transcription_jobs j
    SET cost_eur = CASE WHEN j.cache_hit THEN 0
                        ELSE public.job_cor_eur(j.duration_seconds, j.assemblyai_model, j.diarization, j.proxy_bytes) END
  WHERE j.id = p_job_id
  RETURNING j.cost_eur INTO v;
  RETURN v;
END;
$fn$;
COMMENT ON FUNCTION public.compute_and_store_job_cost(uuid) IS 'ADR-096: berekent + bewaart transcription_jobs.cost_eur voor één job (cache_hit→0). Door de pipeline aangeroepen bij completion.';
REVOKE ALL ON FUNCTION public.compute_and_store_job_cost(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_and_store_job_cost(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_and_store_job_cost(uuid) TO service_role;
