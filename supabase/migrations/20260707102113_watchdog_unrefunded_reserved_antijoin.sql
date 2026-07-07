-- ADR-050 crash-recovery hardening — Pass 2c reconciliatie-vangnet. Bounded-retry op de
-- terminale refund-paden (whisper-success, playlist-completion) dekt transient 522's, maar NIET
-- een worker-crash tussen de terminal-status-set en de refund-retries: dan is de job al
-- 'complete'/'error' en valt buiten Pass 2/2b (die filteren op 'interrupted'), dus de refund is
-- alsnog permanent verloren. Deze anti-join levert precies die gemiste refunds: TERMINALE status
-- + credits_reserved>0 + GEEN (job_id/playlist_id,'refund')-rij. De NOT EXISTS is het
-- idempotentie-filter (correct-afgehandelde jobs verdwijnen zodra hun refund-rij bestaat), en
-- PostgREST kan zo'n anti-join niet — vandaar een SQL-functie. p_limit capt de rijen/cyclus zodat
-- een achterstand de 2-min-cron niet laat overlopen (drainen over meerdere cycli).
CREATE OR REPLACE FUNCTION public.watchdog_unrefunded_reserved(p_limit integer DEFAULT 50)
RETURNS TABLE(entity text, ref_id uuid, ref_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  (SELECT 'job'::text, tj.id, tj.user_id
   FROM public.transcription_jobs tj
   WHERE tj.status IN ('complete','error') AND COALESCE(tj.credits_reserved, 0) > 0
     AND NOT EXISTS (
       SELECT 1 FROM public.credit_transactions ct
       WHERE ct.job_id = tj.id AND ct.kind = 'refund')
   LIMIT p_limit)
  UNION ALL
  (SELECT 'playlist'::text, pj.id, pj.user_id
   FROM public.playlist_extraction_jobs pj
   WHERE pj.status IN ('complete','error') AND COALESCE(pj.credits_reserved, 0) > 0
     AND NOT EXISTS (
       SELECT 1 FROM public.credit_transactions ct
       WHERE ct.playlist_id = pj.id AND ct.kind = 'refund')
   LIMIT p_limit);
$function$;
