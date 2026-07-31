-- Toegepast via Supabase MCP apply_migration (version 20260731142813) — repo-sync.
-- Toevoeging: provider.worker_concurrency_limit / worker_slots_used / worker_saturation_pct — de
-- worker-slot-saturatie-gauge (actief-verwerkende jobs vs ARQ max_jobs, de tightere lokale bottleneck).
-- Toevoegingen op admin_operations_v3: latency.provider_turnaround (submitted->completed, hoofdgetal),
-- audio.wasted_proxy_mb_failed (verspilde proxy-egress op mislukte jobs, gedrag/bytes geen geld),
-- reliability.playlist_errors (by_type+samples voor source_kind=playlist — unit-niveau gat gedicht).
-- admin_operations_v3 rev2: point 1 (job-vs-unit) + verder B (raw error samples).
--
-- Point 1 — JOB-LEVEL aggregates now filter source_kind IN ('single','upload') so playlist child-jobs
-- (source_kind='playlist', created per playlist video) no longer pollute the standalone-AI counts and
-- success rate (ADR-081). UNIT-LEVEL telemetry (latency, audio, provider) stays all-transcriptions on
-- purpose — a playlist video runs through the exact same pipeline, so its timing/size/language IS a
-- valid unit sample. Job-level filtered: traffic.jobs.ai_total, reliability.ai (top-level +
-- success_rate), errors.total, errors.by_type, errors.daily. UNCHANGED (unit-level, all transcriptions):
-- latency.*, audio.*, provider.* — reported as deliberate.
--
-- verder B — errors.samples restored (V2 had it): up to 3 recent raw error_message per error_type
-- (standalone), newest first, 200 chars, for the drill-down.
CREATE OR REPLACE FUNCTION public.admin_operations_v3(
  p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL, p_exclude_internal boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_internal   uuid[];
  v_conc       integer;
  v_worker_max integer;
  v_traffic    jsonb; v_reliability jsonb; v_latency jsonb; v_errors jsonb;
  v_audio      jsonb; v_provider jsonb; v_capacity jsonb;
  v_dl_types   text[] := ARRAY['timeout','connection_error','server_error','bot_detection',
                               'extraction_error','proxy_error','partial_write'];
BEGIN
  v_internal := ARRAY(SELECT id FROM public.profiles WHERE is_internal);
  SELECT value::text::int INTO v_conc FROM public.ops_config WHERE key='assemblyai_concurrency_limit' LIMIT 1;
  SELECT value::text::int INTO v_worker_max FROM public.ops_config WHERE key='worker_concurrency_limit' LIMIT 1;

  SELECT jsonb_build_object(
    'jobs', jsonb_build_object(
      'single',   (SELECT count(*) FROM transcription_jobs t WHERE t.source_kind='single'
                     AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                     AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
      'upload',   (SELECT count(*) FROM transcription_jobs t WHERE t.source_kind='upload'
                     AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                     AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
      'playlist', (SELECT count(*) FROM playlist_extraction_jobs p WHERE
                     (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
                     AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
      -- point 1: standalone AI only (was: all transcription_jobs incl. playlist children)
      'ai_total', (SELECT count(*) FROM transcription_jobs t WHERE t.source_kind IN ('single','upload')
                     AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                     AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))))),
    'units', jsonb_build_object(
      'ai_single_upload',   (SELECT count(*) FROM transcription_jobs t WHERE t.source_kind IN ('single','upload')
                               AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                               AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
      'ai_playlist_videos', (SELECT COALESCE(sum(total_videos),0) FROM playlist_extraction_jobs p WHERE
                               (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
                               AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
      'captions',           (SELECT count(*) FROM usage_logs u WHERE
                               (p_from IS NULL OR u.created_at>=p_from) AND (p_to IS NULL OR u.created_at<p_to)
                               AND (NOT p_exclude_internal OR NOT u.is_internal_at_time))),
    'captions', jsonb_build_object(
      'total',      (SELECT count(*) FROM usage_logs u WHERE
                       (p_from IS NULL OR u.created_at>=p_from) AND (p_to IS NULL OR u.created_at<p_to)
                       AND (NOT p_exclude_internal OR NOT u.is_internal_at_time)),
      'success',    (SELECT count(*) FROM usage_logs u WHERE u.success
                       AND (p_from IS NULL OR u.created_at>=p_from) AND (p_to IS NULL OR u.created_at<p_to)
                       AND (NOT p_exclude_internal OR NOT u.is_internal_at_time)),
      'cache_hits', (SELECT count(*) FROM usage_logs u WHERE u.cache_hit
                       AND (p_from IS NULL OR u.created_at>=p_from) AND (p_to IS NULL OR u.created_at<p_to)
                       AND (NOT p_exclude_internal OR NOT u.is_internal_at_time)))
  ) INTO v_traffic;

  -- point 1: standalone AI only for the top-level rollup + success_rate (by_type FILTERs already scope themselves)
  SELECT jsonb_build_object(
    'ai', (
      SELECT jsonb_build_object(
        'complete', count(*) FILTER (WHERE status='complete'),
        'error',    count(*) FILTER (WHERE status='error'),
        'success_rate', CASE WHEN count(*) FILTER (WHERE status IN ('complete','error'))>0
          THEN round(count(*) FILTER (WHERE status='complete')::numeric
                     / count(*) FILTER (WHERE status IN ('complete','error')),4) ELSE NULL END,
        'by_type', jsonb_build_object(
          'single', jsonb_build_object(
            'complete', count(*) FILTER (WHERE source_kind='single' AND status='complete'),
            'error',    count(*) FILTER (WHERE source_kind='single' AND status='error')),
          'upload', jsonb_build_object(
            'complete', count(*) FILTER (WHERE source_kind='upload' AND status='complete'),
            'error',    count(*) FILTER (WHERE source_kind='upload' AND status='error'))))
      FROM transcription_jobs t WHERE t.source_kind IN ('single','upload')
        AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    'playlist', (
      SELECT jsonb_build_object(
        'jobs_total',      count(*),
        'jobs_complete',   count(*) FILTER (WHERE status='complete'),
        'videos_total',    COALESCE(sum(total_videos),0),
        'videos_complete', COALESCE(sum(completed),0),
        'videos_failed',   COALESCE(sum(failed),0),
        'first_pass_failed', COALESCE(sum(first_pass_failed),0),
        -- how many playlist jobs actually carry the new first_pass_failed capture (non-null) →
        -- lets the UI tell "no data yet" from a real 0 (point 4).
        'first_pass_measured', count(*) FILTER (WHERE first_pass_failed IS NOT NULL))
      FROM playlist_extraction_jobs p WHERE
        (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
    'playlist_recovered', (
      SELECT count(*) FROM playlist_extraction_jobs p, jsonb_each(COALESCE(p.video_results,'{}'::jsonb)) e
      WHERE (e.value->>'recovered')='true'
        AND (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
    -- point 4: has the recovered/attempts capture produced ANY entry yet (across all playlist videos)?
    'attempt_capture_present', (
      SELECT count(*) FROM playlist_extraction_jobs p, jsonb_each(COALESCE(p.video_results,'{}'::jsonb)) e
      WHERE e.value ? 'attempts'
        AND (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
    -- Point 3 (gat gedicht): playlist-video-fouten op UNIT-niveau — de playlist-kindjobs staan in
    -- transcription_jobs met source_kind='playlist' (mét error_message/type), dus zelfde vorm als de
    -- standalone-uitsplitsing maar apart gehouden (unit-niveau hoort bij playlist, niet bij standalone).
    'playlist_errors', jsonb_build_object(
      'total', (SELECT count(*) FROM transcription_jobs t WHERE status='error' AND t.source_kind='playlist'
                  AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                  AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
      'by_type', COALESCE((SELECT jsonb_object_agg(et,c) FROM (
          SELECT COALESCE(error_type,'uncategorized') et, count(*) c
          FROM transcription_jobs t WHERE status='error' AND t.source_kind='playlist'
            AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
            AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
      'samples', COALESCE((SELECT jsonb_object_agg(et, msgs) FROM (
          SELECT et, jsonb_agg(m ORDER BY rn) msgs FROM (
            SELECT COALESCE(error_type,'uncategorized') et, left(error_message,200) m,
                   row_number() OVER (PARTITION BY COALESCE(error_type,'uncategorized') ORDER BY created_at DESC) rn
            FROM transcription_jobs t WHERE status='error' AND error_message IS NOT NULL AND t.source_kind='playlist'
              AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
              AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))
          ) z WHERE rn<=3 GROUP BY et) s),'{}'::jsonb))
  ) INTO v_reliability;

  -- UNIT-LEVEL (all transcriptions incl. playlist videos — same pipeline). NOT filtered by source_kind.
  SELECT jsonb_build_object(
    -- Point 1: provider turnaround (submitted -> completed) is nu het HOOFDgetal — altijd meetbaar
    -- (we zien 'completed'), loopt op bij saturatie, geen live-pad-wijziging. queue_wait_ai +
    -- provider_processing_ms blijven als secundair signaal dat vanzelf vult zodra er echte wachtrij is.
    'provider_turnaround', (
      SELECT jsonb_build_object(
        'p50', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY tt)::numeric,1),
        'p95', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY tt)::numeric,1),
        'max', round(max(tt)::numeric,1), 'sample', count(*))
      FROM (SELECT EXTRACT(EPOCH FROM (completed_at - submitted_at)) tt
            FROM transcription_jobs t
            WHERE status='complete' AND submitted_at IS NOT NULL AND completed_at IS NOT NULL
              AND completed_at > submitted_at
              AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
              AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))) q),
    'queue_wait_ai', (
      SELECT jsonb_build_object(
        'p50', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY qw)::numeric,1),
        'p95', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY qw)::numeric,1),
        'max', round(max(qw)::numeric,1), 'sample', count(*))
      FROM (SELECT EXTRACT(EPOCH FROM (provider_processing_at - submitted_at)) qw
            FROM transcription_jobs t
            WHERE submitted_at IS NOT NULL AND provider_processing_at IS NOT NULL
              AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
              AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))) q),
    'provider_processing_ms', (
      SELECT jsonb_build_object(
        'p50', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY provider_processing_ms)::numeric,0),
        'p95', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY provider_processing_ms)::numeric,0),
        'max', max(provider_processing_ms), 'sample', count(*))
      FROM transcription_jobs t WHERE provider_processing_ms IS NOT NULL
        AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    'download_seconds', (
      SELECT jsonb_build_object(
        'p50', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dl)::numeric,1),
        'p95', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY dl)::numeric,1),
        'max', round(max(dl)::numeric,1), 'sample', count(*))
      FROM (SELECT EXTRACT(EPOCH FROM (submitted_at - started_at)) dl
            FROM transcription_jobs t
            WHERE started_at IS NOT NULL AND submitted_at IS NOT NULL AND submitted_at > started_at
              AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
              AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))) q)
  ) INTO v_latency;

  -- ERRORS — job-level → standalone AI only (point 1). by_type/daily/samples all scoped the same.
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM transcription_jobs t WHERE status='error' AND t.source_kind IN ('single','upload')
                AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    'by_type', COALESCE((SELECT jsonb_object_agg(et,c) FROM (
        SELECT COALESCE(error_type,'uncategorized') et, count(*) c
        FROM transcription_jobs t WHERE status='error' AND t.source_kind IN ('single','upload')
          AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
    -- verder B: up to 3 recent raw messages per type (drill-down), standalone, newest first, 200 chars.
    'samples', COALESCE((SELECT jsonb_object_agg(et, msgs) FROM (
        SELECT et, jsonb_agg(m ORDER BY rn) msgs FROM (
          SELECT COALESCE(error_type,'uncategorized') et, left(error_message,200) m,
                 row_number() OVER (PARTITION BY COALESCE(error_type,'uncategorized') ORDER BY created_at DESC) rn
          FROM transcription_jobs t WHERE status='error' AND error_message IS NOT NULL
            AND t.source_kind IN ('single','upload')
            AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
            AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))
        ) z WHERE rn<=3 GROUP BY et) s),'{}'::jsonb),
    'download_by_duration', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'bucket', bucket, 'total', total, 'dl_failures', dlf,
        'pct', CASE WHEN total>0 THEN round(100.0*dlf/total,1) ELSE 0 END) ORDER BY bucket)
      FROM (
        SELECT CASE WHEN em IS NULL THEN '5) onbekend'
                    WHEN em<=20 THEN '1) 0-20m' WHEN em<=60 THEN '2) 20-60m'
                    WHEN em<=120 THEN '3) 60-120m' ELSE '4) 120m+' END bucket,
               count(*) total,
               count(*) FILTER (WHERE status='error' AND error_type = ANY(v_dl_types)) dlf
        FROM (SELECT status, error_type,
                     COALESCE(NULLIF(credits_reserved,0), CEIL(duration_seconds/60.0)) em
              FROM transcription_jobs t WHERE t.source_kind IN ('single','upload')
                AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))) b
        GROUP BY 1) g),'[]'::jsonb),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', d, 'jobs', j, 'errors', e) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at)::date d, count(*) j, count(*) FILTER (WHERE status='error') e
        FROM transcription_jobs t WHERE t.source_kind IN ('single','upload')
          AND created_at >= COALESCE(p_from, now()-interval '30 days') AND (p_to IS NULL OR created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))
        GROUP BY 1) s),'[]'::jsonb)
  ) INTO v_errors;

  -- UNIT-LEVEL — all transcriptions (playlist videos download + transcribe too).
  SELECT jsonb_build_object(
    'formats', COALESCE((SELECT jsonb_object_agg(ff,c) FROM (
        SELECT COALESCE(NULLIF(file_format,''),'unknown') ff, count(*) c
        FROM transcription_jobs t WHERE
          (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
    'download_mb', (
      SELECT jsonb_build_object(
        'p50', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY proxy_bytes)::numeric/1048576,1),
        'p95', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY proxy_bytes)::numeric/1048576,1),
        'max', round(max(proxy_bytes)::numeric/1048576,1), 'sample', count(*))
      FROM transcription_jobs t WHERE proxy_bytes IS NOT NULL AND proxy_bytes>0
        AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    -- Point 2 (uit de mockup, zonder geld): verspilde proxy-egress op MISLUKTE jobs — gedrag, geen
    -- bedrag. Bytes die we over de proxy trokken voor een download die uiteindelijk faalde. In MB.
    'wasted_proxy_mb_failed', (
      SELECT round(COALESCE(sum(proxy_bytes),0)::numeric/1048576,1)
      FROM transcription_jobs t WHERE status='error' AND proxy_bytes>0
        AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))))
  ) INTO v_audio;

  SELECT jsonb_build_object(
    'languages', COALESCE((SELECT jsonb_object_agg(lang,c) FROM (
        SELECT assemblyai_language lang, count(*) c
        FROM transcription_jobs t WHERE assemblyai_language IS NOT NULL
          AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
    'models', COALESCE((SELECT jsonb_object_agg(m,c) FROM (
        SELECT assemblyai_model m, count(*) c
        FROM transcription_jobs t WHERE assemblyai_model IS NOT NULL
          AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
    'concurrency_limit', v_conc,
    'in_flight_now', (SELECT count(*) FROM transcription_jobs t WHERE status='transcribing'),
    'saturation_pct', CASE WHEN v_conc>0 THEN round(100.0*(SELECT count(*) FROM transcription_jobs t
        WHERE status='transcribing')/v_conc,1) ELSE NULL END,
    -- Worker-slot-saturatie: actief-verwerkende jobs (downloading/transcribing/saving) vs de ARQ
    -- worker-concurrency-cap (WorkerSettings.max_jobs, gespiegeld in ops_config). Dit is de TIGHTERE,
    -- lokale bottleneck (10) t.o.v. de AssemblyAI-cap (200) — het echte "zitten we vol"-signaal.
    'worker_concurrency_limit', v_worker_max,
    'worker_slots_used', (SELECT count(*) FROM transcription_jobs t WHERE status IN ('downloading','transcribing','saving')),
    'worker_saturation_pct', CASE WHEN v_worker_max>0 THEN round(100.0*(SELECT count(*) FROM transcription_jobs t
        WHERE status IN ('downloading','transcribing','saving'))/v_worker_max,1) ELSE NULL END
  ) INTO v_provider;

  SELECT jsonb_build_object(
    'in_flight', count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    'stuck', count(*) FILTER (WHERE status IN ('pending','downloading','transcribing','saving')
      AND NOT (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes')),
    'queue_depth_now', count(*) FILTER (WHERE status IN ('pending','downloading')
      AND (created_at > now()-interval '30 minutes' OR COALESCE(last_heartbeat_at,'-infinity'::timestamptz) > now()-interval '10 minutes'))
  ) INTO v_capacity
  FROM transcription_jobs t WHERE (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)));

  RETURN jsonb_build_object(
    'traffic', v_traffic, 'reliability', v_reliability, 'latency', v_latency,
    'errors', v_errors, 'audio', v_audio, 'provider', v_provider, 'capacity', v_capacity,
    'window', jsonb_build_object('from', p_from, 'to', p_to, 'exclude_internal', p_exclude_internal)
  );
END;
$function$;