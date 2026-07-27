-- Toegepast via Supabase MCP apply_migration. Deze file is de DEFINITIEVE vorm van
-- admin_operations_v3 (supersedet de intra-sessie tussenversie 20260727134852, die de ops_config-
-- kolomnaam verkeerd las). Repo-sync: dit is wat er live staat.
--
-- V3 Operations-datalaag (commit 4): deel 1-5 metrics in één JSON — traffic (jobs vs units apart),
-- reliability (AI success + playlist first-pass/recovery), latency (mediaan/p95/max, leeg!=0),
-- errors (per type + download-faal per duurcategorie + dagreeks), audio (formaat + downloadgrootte),
-- provider (taal/model + concurrency-saturatie), capacity. GELD zit hier NIET in — dat blijft Finance.

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
  v_traffic    jsonb; v_reliability jsonb; v_latency jsonb; v_errors jsonb;
  v_audio      jsonb; v_provider jsonb; v_capacity jsonb;
  v_dl_types   text[] := ARRAY['timeout','connection_error','server_error','bot_detection',
                               'extraction_error','proxy_error','partial_write'];
BEGIN
  v_internal := ARRAY(SELECT id FROM public.profiles WHERE is_internal);
  SELECT value::text::int INTO v_conc FROM public.ops_config WHERE key='assemblyai_concurrency_limit' LIMIT 1;

  -- ── DEEL 1: TRAFFIC — jobs per type EN units apart (job != unit) ──
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
      'ai_total', (SELECT count(*) FROM transcription_jobs t WHERE
                     (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
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

  -- ── DEEL 2: RELIABILITY — AI success + playlist first-pass vs effective + recovery ──
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
      FROM transcription_jobs t WHERE
        (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    'playlist', (
      SELECT jsonb_build_object(
        'jobs_total',      count(*),
        'jobs_complete',   count(*) FILTER (WHERE status='complete'),
        'videos_total',    COALESCE(sum(total_videos),0),
        'videos_complete', COALESCE(sum(completed),0),
        'videos_failed',   COALESCE(sum(failed),0),
        'first_pass_failed', COALESCE(sum(first_pass_failed),0))
      FROM playlist_extraction_jobs p WHERE
        (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal)))),
    'playlist_recovered', (
      SELECT count(*) FROM playlist_extraction_jobs p, jsonb_each(COALESCE(p.video_results,'{}'::jsonb)) e
      WHERE (e.value->>'recovered')='true'
        AND (p_from IS NULL OR p.created_at>=p_from) AND (p_to IS NULL OR p.created_at<p_to)
        AND (NOT p_exclude_internal OR NOT (p.user_id = ANY(v_internal))))
  ) INTO v_reliability;

  -- ── DEEL 5: LATENCY — mediaan/p95/max, leeg != 0 (nulls tellen niet mee in percentile/max) ──
  SELECT jsonb_build_object(
    'queue_wait_ai', (  -- AssemblyAI wachtrij: submitted -> processing (commit 3)
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
    'download_seconds', (  -- download+ffmpeg: started -> submitted
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

  -- ── DEEL 4-ERR: ERRORS — totaal, per type, download-faal per duurcategorie, dagreeks ──
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM transcription_jobs t WHERE status='error'
                AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
                AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))),
    'by_type', COALESCE((SELECT jsonb_object_agg(et,c) FROM (
        SELECT COALESCE(error_type,'uncategorized') et, count(*) c
        FROM transcription_jobs t WHERE status='error'
          AND (p_from IS NULL OR t.created_at>=p_from) AND (p_to IS NULL OR t.created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))) GROUP BY 1) x),'{}'::jsonb),
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
        FROM transcription_jobs t WHERE
          created_at >= COALESCE(p_from, now()-interval '30 days') AND (p_to IS NULL OR created_at<p_to)
          AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal)))
        GROUP BY 1) s),'[]'::jsonb)
  ) INTO v_errors;

  -- ── DEEL 3: AUDIO-TELEMETRIE — formaatverdeling + downloadgrootte ──
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
        AND (NOT p_exclude_internal OR NOT (t.user_id = ANY(v_internal))))
  ) INTO v_audio;

  -- ── DEEL 4: PROVIDER-GEZONDHEID — taal/model-verdeling + concurrency-saturatie ──
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
        WHERE status='transcribing')/v_conc,1) ELSE NULL END
  ) INTO v_provider;

  -- ── CAPACITY — in-flight / stuck / queue-diepte NU (live, geen venster) ──
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
