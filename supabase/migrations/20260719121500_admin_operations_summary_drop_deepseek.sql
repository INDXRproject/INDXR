-- ADR-068 cleanup: the swap orphans the DeepSeek prepaid-balance poll, so the Operations
-- 'services.deepseek' widget is removed. AssemblyAI (the new provider) has no balance API — nothing
-- replaces it. Only the DeepSeek block goes; all other operations metrics are byte-identical.
CREATE OR REPLACE FUNCTION public.admin_operations_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_complete    integer := 0;
  v_error       integer := 0;
  v_in_flight   integer := 0;
  v_stuck       integer := 0;
  v_error_types jsonb;
  v_queue_now   integer := 0;
  v_queue_wait  numeric;
  v_proc_avg    numeric;
  v_pl_total    integer := 0;
  v_pl_complete integer := 0;
  v_pl_retry    integer := 0;
  v_watchdog    integer := 0;
BEGIN
  SELECT
    count(*) FILTER (WHERE status='complete'),
    count(*) FILTER (WHERE status='error'),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND (created_at > now() - interval '30 minutes'
           OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes')),
    count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND NOT (created_at > now() - interval '30 minutes'
           OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes')),
    count(*) FILTER (WHERE watchdog_attempts > 0)
  INTO v_complete, v_error, v_in_flight, v_stuck, v_watchdog
  FROM public.transcription_jobs;

  SELECT jsonb_object_agg(et, c) INTO v_error_types FROM (
    SELECT COALESCE(error_type, 'uncategorized') AS et, count(*) c
    FROM public.transcription_jobs WHERE status='error' GROUP BY 1) e;

  SELECT count(*) INTO v_queue_now FROM public.transcription_jobs
   WHERE status IN ('pending','downloading')
     AND (created_at > now() - interval '30 minutes'
          OR COALESCE(last_heartbeat_at, '-infinity'::timestamptz) > now() - interval '10 minutes');
  SELECT round(avg(EXTRACT(EPOCH FROM (started_at - created_at)))::numeric, 1) INTO v_queue_wait
   FROM public.transcription_jobs WHERE started_at IS NOT NULL AND created_at IS NOT NULL;
  SELECT round(avg(processing_time_seconds)::numeric, 1) INTO v_proc_avg
   FROM public.transcription_jobs WHERE status='complete' AND processing_time_seconds IS NOT NULL;

  SELECT count(*), count(*) FILTER (WHERE status='complete'), count(*) FILTER (WHERE is_retry)
  INTO v_pl_total, v_pl_complete, v_pl_retry FROM public.playlist_extraction_jobs;

  RETURN jsonb_build_object(
    'jobs', jsonb_build_object(
      'total', v_complete + v_error + v_in_flight + v_stuck,
      'complete', v_complete, 'error', v_error, 'in_flight', v_in_flight, 'stuck', v_stuck),
    'success_rate', CASE WHEN (v_complete + v_error) > 0
                         THEN round(v_complete::numeric / (v_complete + v_error), 4) ELSE NULL END,
    'error_types', COALESCE(v_error_types, '{}'::jsonb),
    'retries', jsonb_build_object('playlist_retried', v_pl_retry, 'watchdog', v_watchdog),
    'capacity', jsonb_build_object(
      'queue_depth_now', v_queue_now,
      'avg_queue_wait_sec', v_queue_wait,
      'avg_processing_sec', v_proc_avg),
    'playlist', jsonb_build_object('total', v_pl_total, 'complete', v_pl_complete)
  );
END;
$function$;
