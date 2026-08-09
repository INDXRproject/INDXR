-- ADR-096 addendum: admin_pipeline_metrics krijgt `duration_classes` — de mediane TOTALE doorlooptijd
-- per audioduur-klasse (≤15min / 15min–1h / 1–2h / >2h) + aantal jobs per klasse. Een gemiddelde over
-- álle jobs is misleidend (5min vs 4uur schalen niet gelijk); vandaar per klasse, met n zodat te-dunne
-- klassen zichtbaar zijn. Dit is de BRON voor de wachttijd-claim op /articles/audio-to-text (1 uur → een
-- paar minuten = klasse "15min–1h"; 2 uur → ~kwartier = klasse "1–2h"). CREATE OR REPLACE (de vorige
-- definitie is al gecommit in migratie 20260809171000; die niet muteren, hier vervangen).

CREATE OR REPLACE FUNCTION public.admin_pipeline_metrics()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
  WITH j AS (
    SELECT download_ms, compress_ms, transcribe_ms, save_ms, duration_seconds,
           (processing_time_seconds * 1000)::numeric AS total_ms,
           processing_time_seconds::numeric AS total_s,
           CASE WHEN duration_seconds > 0 THEN processing_time_seconds::numeric / duration_seconds ELSE NULL END AS rtf
    FROM public.transcription_jobs
    WHERE status='complete' AND cache_hit=false AND source_kind IS DISTINCT FROM 'ai_summary'
      AND processing_time_seconds > 0
  ),
  pct AS (
    SELECT 'download_ms' AS metric, 'ms' AS unit, count(download_ms) AS n,
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY download_ms))::numeric,0) AS p50,
           round((percentile_cont(0.90) WITHIN GROUP (ORDER BY download_ms))::numeric,0) AS p90,
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY download_ms))::numeric,0) AS p95,
           round((percentile_cont(0.99) WITHIN GROUP (ORDER BY download_ms))::numeric,0) AS p99 FROM j
    UNION ALL
    SELECT 'compress_ms','ms',count(compress_ms),
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY compress_ms))::numeric,0), round((percentile_cont(0.90) WITHIN GROUP (ORDER BY compress_ms))::numeric,0),
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY compress_ms))::numeric,0), round((percentile_cont(0.99) WITHIN GROUP (ORDER BY compress_ms))::numeric,0) FROM j
    UNION ALL
    SELECT 'transcribe_ms','ms',count(transcribe_ms),
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY transcribe_ms))::numeric,0), round((percentile_cont(0.90) WITHIN GROUP (ORDER BY transcribe_ms))::numeric,0),
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY transcribe_ms))::numeric,0), round((percentile_cont(0.99) WITHIN GROUP (ORDER BY transcribe_ms))::numeric,0) FROM j
    UNION ALL
    SELECT 'save_ms','ms',count(save_ms),
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY save_ms))::numeric,0), round((percentile_cont(0.90) WITHIN GROUP (ORDER BY save_ms))::numeric,0),
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY save_ms))::numeric,0), round((percentile_cont(0.99) WITHIN GROUP (ORDER BY save_ms))::numeric,0) FROM j
    UNION ALL
    SELECT 'total_ms','ms',count(total_ms),
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY total_ms))::numeric,0), round((percentile_cont(0.90) WITHIN GROUP (ORDER BY total_ms))::numeric,0),
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms))::numeric,0), round((percentile_cont(0.99) WITHIN GROUP (ORDER BY total_ms))::numeric,0) FROM j
    UNION ALL
    SELECT 'rtf','ratio',count(rtf),
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY rtf))::numeric,4), round((percentile_cont(0.90) WITHIN GROUP (ORDER BY rtf))::numeric,4),
           round((percentile_cont(0.95) WITHIN GROUP (ORDER BY rtf))::numeric,4), round((percentile_cont(0.99) WITHIN GROUP (ORDER BY rtf))::numeric,4) FROM j
  ),
  dcls AS (
    SELECT
      CASE WHEN duration_seconds <= 900 THEN 1 WHEN duration_seconds <= 3600 THEN 2
           WHEN duration_seconds <= 7200 THEN 3 ELSE 4 END AS ord,
      CASE WHEN duration_seconds <= 900 THEN '≤15 min' WHEN duration_seconds <= 3600 THEN '15 min–1 h'
           WHEN duration_seconds <= 7200 THEN '1–2 h' ELSE '>2 h' END AS label,
      total_s
    FROM j WHERE duration_seconds > 0
  ),
  dclsagg AS (
    SELECT ord, label, count(*) AS n,
           round((percentile_cont(0.50) WITHIN GROUP (ORDER BY total_s))::numeric,0) AS median_total_s
    FROM dcls GROUP BY ord, label
  ),
  trend AS (
    SELECT COALESCE(assemblyai_language,'unknown') AS language,
           to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
           round(avg(transcript_confidence)::numeric,4) AS avg_confidence,
           round(avg(language_confidence)::numeric,4)   AS avg_language_confidence,
           count(*) AS n
    FROM public.transcription_jobs
    WHERE status='complete' AND cache_hit=false AND source_kind IS DISTINCT FROM 'ai_summary'
      AND transcript_confidence IS NOT NULL AND created_at >= now() - interval '12 weeks'
    GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'phase_percentiles', (SELECT COALESCE(jsonb_agg(to_jsonb(pct) ORDER BY metric), '[]'::jsonb) FROM pct),
    'duration_classes',  (SELECT COALESCE(jsonb_agg(jsonb_build_object('label',label,'n',n,'median_total_s',median_total_s) ORDER BY ord), '[]'::jsonb) FROM dclsagg),
    'confidence_trend',  (SELECT COALESCE(jsonb_agg(to_jsonb(trend) ORDER BY language, week), '[]'::jsonb) FROM trend),
    'generated_at', now()
  );
$fn$;

COMMENT ON FUNCTION public.admin_pipeline_metrics() IS 'ADR-096: Operations-panelen — fasetijd/RTF-percentielen, mediane doorlooptijd per duurklasse (bron voor de /articles/audio-to-text wachttijd-claim), en confidence-trend per taal per week. Admin-only.';
REVOKE ALL ON FUNCTION public.admin_pipeline_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_pipeline_metrics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pipeline_metrics() TO service_role;
