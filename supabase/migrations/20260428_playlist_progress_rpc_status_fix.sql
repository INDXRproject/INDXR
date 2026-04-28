-- Fix: status 'completed' → 'complete' in update_playlist_video_progress
-- Reden: frontend PlaylistTab.tsx checkt status === 'complete' (bestaande conventie).
-- De eerste migratie (20260428_playlist_per_video_chain.sql) schreef 'completed' — incorrect.
-- Datum: 2026-04-28

CREATE OR REPLACE FUNCTION update_playlist_video_progress(
  p_playlist_id  UUID,
  p_video_id     TEXT,
  p_status       TEXT,
  p_transcript_id UUID DEFAULT NULL,
  p_error_type   TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job           playlist_extraction_jobs%ROWTYPE;
  v_existing      jsonb;
  v_new_entry     jsonb;
  v_already_done  boolean := false;
  v_new_completed integer;
  v_new_failed    integer;
  v_is_complete   boolean;
BEGIN
  SELECT * INTO v_job
  FROM playlist_extraction_jobs
  WHERE id = p_playlist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'playlist_extraction_jobs rij niet gevonden: %', p_playlist_id;
  END IF;

  v_existing := v_job.video_results -> p_video_id;
  IF v_existing IS NOT NULL AND (v_existing ->> 'status') = p_status THEN
    v_already_done := true;
  END IF;

  IF p_status = 'success' THEN
    v_new_entry := jsonb_build_object(
      'status',        'success',
      'transcript_id', p_transcript_id
    );
  ELSE
    v_new_entry := jsonb_build_object(
      'status',      'error',
      'error_type',  p_error_type
    );
  END IF;

  IF v_already_done THEN
    v_new_completed := v_job.completed;
    v_new_failed    := v_job.failed;
  ELSE
    IF p_status = 'success' THEN
      v_new_completed := v_job.completed + 1;
      v_new_failed    := v_job.failed;
    ELSE
      v_new_completed := v_job.completed;
      v_new_failed    := v_job.failed + 1;
    END IF;
  END IF;

  v_is_complete := (v_new_completed + v_new_failed) >= v_job.total_videos;

  UPDATE playlist_extraction_jobs SET
    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),
    completed        = v_new_completed,
    failed           = v_new_failed,
    last_progress_at = NOW(),
    status           = CASE WHEN v_is_complete THEN 'complete' ELSE status END,
    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,
    processing_time_seconds = CASE
      WHEN v_is_complete
      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer
      ELSE processing_time_seconds
    END
  WHERE id = p_playlist_id;

  RETURN jsonb_build_object(
    'playlist_complete', v_is_complete,
    'completed',         v_new_completed,
    'failed',            v_new_failed,
    'total',             v_job.total_videos
  );
END;
$$;

COMMENT ON FUNCTION update_playlist_video_progress IS
  'Atomic per-video progress update for playlist chain pattern. '
  'Zie ADR-025. Idempotent: dubbele aanroep met identieke args '
  'verhoogt counters niet. Triggert auto-completion (status=''complete'') '
  'wanneer completed + failed >= total_videos.';
