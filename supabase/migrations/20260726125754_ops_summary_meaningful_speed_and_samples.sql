-- Toegepast via Supabase MCP apply_migration (version 20260726125754) — dit bestand houdt de repo in sync.
--
-- Fase 2b: betekenisvolle Operations-cijfers i.p.v. blended gemiddelden.
-- (1) "avg processing" was zinloos (mengt 3u-AI met instant-captions) -> vervangen door een LENGTE-
--     ONAFHANKELIJKE snelheid: mediaan(processing_sec / audio_sec) voor AI-jobs -> "1u-video kost ~X min".
-- (2) gemiddelden -> mediaan (p50) + p95 (staart), want een uitschieter vertekent een mean.
-- (3) error_samples: tot 3 recente RUWE error_messages per type -> de "unknown"-bak wordt diagnosticeerbaar.
-- Signature ongewijzigd (3 args) -> CREATE OR REPLACE; Overview (no-arg defaults) blijft werken.

CREATE OR REPLACE FUNCTION public.admin_operations_summary(
  p_from             timestamptz DEFAULT NULL,
  p_to               timestamptz DEFAULT NULL,
  p_exclude_internal boolean     DEFAULT false
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_internal    uuid[];
  v_complete    integer; v_error integer; v_in_flight integer; v_stuck integer;
  v_error_types jsonb;   v_error_samples jsonb; v_queue_now integer;
  v_qw_p50 numeric; v_qw_p95 numeric; v_rt_factor numeric; v_rt_sample integer;
  v_total_win   integer; v_pl_total integer; v_pl_complete integer; v_pl_retry integer; v_watchdog integer;
BEGIN
  v_internal := ARRAY(SELECT id FROM public.profiles WHERE is_internal);

  SELECT
    count(*) FILTER (WHERE status='complete'),
    count(*) FILTER (WHERE status='error'),
    count(*) FILTER (WHERE watchdog_attempts > 0),
    count(*)
  INTO v_complete, v_error, v_watchdog, v_total_win
  FROM public.transcription_jobs tj
  WHERE (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT jsonb_object_agg(et, c) INTO v_error_types FROM (
    SELECT COALESCE(error_type,'uncategorized') et, count(*) c
    FROM public.transcription_jobs tj
    WHERE status='error'
      AND (p_from IS NULL OR tj.created_at >= p_from)
      AND (p_to   IS NULL OR tj.created_at <  p_to)
      AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)))
    GROUP BY 1) e;

  SELECT jsonb_object_agg(et, msgs) INTO v_error_samples FROM (
    SELECT et, jsonb_agg(m ORDER BY rn) AS msgs FROM (
      SELECT COALESCE(error_type,'uncategorized') et,
             left(error_message, 200) m,
             row_number() OVER (PARTITION BY COALESCE(error_type,'uncategorized') ORDER BY created_at DESC) rn
      FROM public.transcription_jobs tj
      WHERE status='error' AND error_message IS NOT NULL
        AND (p_from IS NULL OR tj.created_at >= p_from)
        AND (p_to   IS NULL OR tj.created_at <  p_to)
        AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)))
    ) x WHERE rn <= 3 GROUP BY et) s;

  SELECT
    round(percentile_cont(0.5)  WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1),
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1)
  INTO v_qw_p50, v_qw_p95
  FROM public.transcription_jobs tj
  WHERE started_at IS NOT NULL AND created_at IS NOT NULL
    AND (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY processing_time_seconds::numeric / NULLIF(duration_seconds,0))::numeric, 4),
    count(*)
  INTO v_rt_factor, v_rt_sample
  FROM public.transcription_jobs tj
  WHERE status='complete' AND processing_time_seconds IS NOT NULL
    AND duration_seconds IS NOT NULL AND duration_seconds > 0
    AND (p_from IS NULL OR tj.created_at >= p_from)
    AND (p_to   IS NULL OR tj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND NOT (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes'))
  INTO v_in_flight, v_stuck, v_queue_now
  FROM public.transcription_jobs tj
  WHERE (NOT p_exclude_internal OR NOT (tj.user_id = ANY(v_internal)));

  SELECT count(*), count(*) FILTER (WHERE status='complete'), count(*) FILTER (WHERE is_retry)
  INTO v_pl_total, v_pl_complete, v_pl_retry
  FROM public.playlist_extraction_jobs pj
  WHERE (p_from IS NULL OR pj.created_at >= p_from)
    AND (p_to   IS NULL OR pj.created_at <  p_to)
    AND (NOT p_exclude_internal OR NOT (pj.user_id = ANY(v_internal)));

  RETURN jsonb_build_object(
    'jobs', jsonb_build_object(
      'total', v_total_win,
      'complete', v_complete, 'error', v_error, 'in_flight', v_in_flight, 'stuck', v_stuck),
    'success_rate', CASE WHEN (v_complete+v_error)>0 THEN round(v_complete::numeric/(v_complete+v_error),4) ELSE NULL END,
    'error_types', COALESCE(v_error_types,'{}'::jsonb),
    'error_samples', COALESCE(v_error_samples,'{}'::jsonb),
    'retries', jsonb_build_object('playlist_retried', v_pl_retry, 'watchdog', v_watchdog),
    'capacity', jsonb_build_object(
      'queue_depth_now', v_queue_now,
      'queue_wait_p50', v_qw_p50,
      'queue_wait_p95', v_qw_p95,
      'ai_realtime_factor', v_rt_factor,
      'ai_speed_sample', v_rt_sample),
    'playlist', jsonb_build_object('total', v_pl_total, 'complete', v_pl_complete),
    'window', jsonb_build_object('from', p_from, 'to', p_to, 'exclude_internal', p_exclude_internal)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_operations_summary(timestamptz,timestamptz,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_summary(timestamptz,timestamptz,boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
