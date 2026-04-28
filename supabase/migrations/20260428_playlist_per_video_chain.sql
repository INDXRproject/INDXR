-- Migratie: playlist per-video chain fundament (Fase 3a)
-- Zie ADR-025 (per-video decompositie) en ADR-019 (ARQ transport)
-- Datum: 2026-04-28

-- ─── 1. Kolom: last_progress_at ───────────────────────────────────────────────
-- Geen DEFAULT — bestaande (legacy) rijen krijgen NULL. Nieuwe jobs
-- schrijven dit via update_playlist_video_progress bij elke video-update.
ALTER TABLE playlist_extraction_jobs
  ADD COLUMN last_progress_at TIMESTAMPTZ;


-- ─── 2. Index: stale-detection (Fase 3d) ──────────────────────────────────────
-- Partial index: alleen running jobs. Stale-detection scant uitsluitend
-- running jobs, dus completed/failed rijen niet opnemen in de index.
CREATE INDEX idx_playlist_jobs_last_progress
  ON playlist_extraction_jobs (last_progress_at)
  WHERE status = 'running';


-- ─── 3. RPC: update_playlist_video_progress ───────────────────────────────────
-- Atomische per-video update: video_results JSONB + counters + last_progress_at
-- + auto-completion wanneer completed + failed >= total_videos.
--
-- Idempotent: als video_results al een entry voor p_video_id heeft met
-- dezelfde status, worden counters NIET opnieuw verhoogd. Wel wordt
-- last_progress_at bijgewerkt (zodat stale-detection niet vals triggert).
CREATE OR REPLACE FUNCTION update_playlist_video_progress(
  p_playlist_id  UUID,
  p_video_id     TEXT,
  p_status       TEXT,             -- 'success' of 'error'
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
  -- Lock de rij voor de duur van de transactie
  SELECT * INTO v_job
  FROM playlist_extraction_jobs
  WHERE id = p_playlist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'playlist_extraction_jobs rij niet gevonden: %', p_playlist_id;
  END IF;

  -- Idempotentie: controleer of deze video_id al met dezelfde status is geregistreerd
  v_existing := v_job.video_results -> p_video_id;
  IF v_existing IS NOT NULL AND (v_existing ->> 'status') = p_status THEN
    v_already_done := true;
  END IF;

  -- Bouw de nieuwe JSONB-entry op
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

  -- Bereken nieuwe counter-waarden
  -- Bij idempotente heruitvoer: counters ongewijzigd
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

  -- Atomische update
  UPDATE playlist_extraction_jobs SET
    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),
    completed        = v_new_completed,
    failed           = v_new_failed,
    last_progress_at = NOW(),
    status           = CASE WHEN v_is_complete THEN 'completed' ELSE status END,
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


-- ─── 4. Grants ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT)
  TO authenticated, service_role;


-- ─── 5. Documentatie ──────────────────────────────────────────────────────────
COMMENT ON FUNCTION update_playlist_video_progress IS
  'Atomic per-video progress update for playlist chain pattern. Zie ADR-025. '
  'Idempotent: dubbele aanroep met identieke args verhoogt counters niet. '
  'Triggert auto-completion wanneer completed + failed >= total_videos.';
