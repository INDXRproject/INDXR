-- ADR-096: data-bron voor de twee nieuwe Operations-panelen.
--  1) phase_percentiles: fasetijden (download/compress/transcribe/save/total, ms) + real-time factor
--     in p50/p90/p95/p99 (percentielen, geen gemiddelden) over voltooide echte transcripties.
--  2) confidence_trend: gemiddelde transcript-/taal-confidence per taal per week (laatste 12 weken).
-- Admin-only (SECURITY DEFINER, REVOKE anon/authenticated, GRANT service_role). percentile_cont geeft
-- double precision terug (cast naar numeric vóór round). Leest alleen meetkolommen; geen inhoud.

CREATE OR REPLACE FUNCTION public.admin_pipeline_metrics()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
  WITH j AS (
    SELECT download_ms, compress_ms, transcribe_ms, save_ms,
           (processing_time_seconds * 1000)::numeric AS total_ms,
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
  trend AS (
    SELECT COALESCE(assemblyai_language,'unknown') AS language,
           to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
           round(avg(transcript_confidence)::numeric,4) AS avg_confidence,
           round(avg(language_confidence)::numeric,4)   AS avg_language_confidence,
           count(*) AS n
    FROM public.transcription_jobs
    WHERE status='complete' AND cache_hit=false AND source_kind IS DISTINCT FROM 'ai_summary'
      AND transcript_confidence IS NOT NULL
      AND created_at >= now() - interval '12 weeks'
    GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'phase_percentiles', (SELECT COALESCE(jsonb_agg(to_jsonb(pct) ORDER BY metric), '[]'::jsonb) FROM pct),
    'confidence_trend',  (SELECT COALESCE(jsonb_agg(to_jsonb(trend) ORDER BY language, week), '[]'::jsonb) FROM trend),
    'generated_at', now()
  );
$fn$;

COMMENT ON FUNCTION public.admin_pipeline_metrics() IS 'ADR-096: Operations-panelen — fasetijd/RTF-percentielen + confidence-trend per taal per week. Admin-only.';
REVOKE ALL ON FUNCTION public.admin_pipeline_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_pipeline_metrics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pipeline_metrics() TO service_role;
