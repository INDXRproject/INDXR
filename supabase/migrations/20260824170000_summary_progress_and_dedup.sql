-- Summary-generatie: live voortgang (hoofdstuk X van N), per-hoofdstuk-timing in de bestaande meetlaag,
-- en een ATOMISCHE dubbel-start-garantie (partiële unieke index) zodat een tweede gelijktijdige POST
-- nooit een tweede draaiende job — en dus nooit een tweede reservering — kan maken.

-- 1. Live voortgangstellers op de job-rij (nullable; de frontend toont ze alleen bij niet-terminale status).
ALTER TABLE public.transcription_jobs
  ADD COLUMN IF NOT EXISTS summary_sections_total integer,
  ADD COLUMN IF NOT EXISTS summary_sections_done integer;

-- 2. Per-hoofdstuk-doorlooptijd in de bestaande AI-summary-meetlaag (ADR-096): chapter_index + chapter_ms
--    worden op de sectiecall-rijen gezet zodat de duur per hoofdstuk achteraf te bevragen is.
ALTER TABLE public.ai_summary_usage_log
  ADD COLUMN IF NOT EXISTS chapter_index integer,
  ADD COLUMN IF NOT EXISTS chapter_ms integer;

-- 3. Dubbel-start-garantie: hoogstens één NIET-TERMINALE ai_summary-job per (user, transcript). Dekt ALLE
--    niet-terminale statussen (ook 'pending' in de wachtrij), niet alleen 'summarizing'. Een tweede insert
--    faalt dan met 23505; start_summary vangt dat en geeft de bestaande job terug (geen foutmelding).
--    Verandert reserve/settle/refund NIET — de reservering staat ná de insert, dus een gefaalde insert
--    reserveert niets.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_ai_summary_job
  ON public.transcription_jobs (user_id, transcript_id)
  WHERE source_kind = 'ai_summary' AND status NOT IN ('complete', 'error');
