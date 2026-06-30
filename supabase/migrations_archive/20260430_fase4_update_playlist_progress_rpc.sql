-- Fase 4: update_playlist_video_progress RPC uitbreiden met credit-idempotency
-- p_amount: credits te deduceren bij succesvolle video (0 = gratis/caption zonder kosten).
-- p_reason: audit-tekst voor credit_transactions rij.
--
-- Credit-deductie zit nu ATOMISCH in de RPC:
--   - Alleen als NOT v_already_done (replay slaat aftrek over → geen dubbele deductie).
--   - Alleen als p_status = 'success' en p_amount > 0.
--   - UPDATE user_credits + INSERT credit_transactions in dezelfde transactie als de
--     video_results update — geen race-window meer tussen backend-deductie en RPC-aanroep.
-- Zie ADR-025 (per-video decompositie) en Fase 4 plan (credit-idempotency).

-- ─── 0. Drop oude 5-arg signature ────────────────────────────────────────────
-- Nodig om GRANT-ambiguïteit te vermijden; nieuwe 7-arg versie is backwards-compatible
-- (p_amount DEFAULT 0, p_reason DEFAULT 'Playlist caption extraction').
DROP FUNCTION IF EXISTS update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT);


-- ─── 1. RPC aanmaken (nieuwe 7-arg signature) ─────────────────────────────────

CREATE OR REPLACE FUNCTION update_playlist_video_progress(
  p_playlist_id   UUID,
  p_video_id      TEXT,
  p_status        TEXT,             -- 'success' of 'error'
  p_transcript_id UUID    DEFAULT NULL,
  p_error_type    TEXT    DEFAULT NULL,
  p_amount        INTEGER DEFAULT 0,
  p_reason        TEXT    DEFAULT 'Playlist caption extraction'
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

  -- Credit-deductie: atomisch met de progress-update, beschermd door v_already_done.
  -- Bij worker-restart (ack_late=True) slaat de tweede aanroep de aftrek over.
  IF NOT v_already_done AND p_status = 'success' AND p_amount > 0 THEN
    UPDATE user_credits
    SET credits    = credits - p_amount,
        updated_at = NOW()
    WHERE user_id = v_job.user_id;

    INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (
      v_job.user_id,
      -p_amount,
      'debit',
      p_reason,
      jsonb_build_object('playlist_id', p_playlist_id, 'video_id', p_video_id)
    );
  END IF;

  -- Bouw de nieuwe JSONB-entry op
  IF p_status = 'success' THEN
    v_new_entry := jsonb_build_object(
      'status',        'success',
      'transcript_id', p_transcript_id
    );
  ELSE
    v_new_entry := jsonb_build_object(
      'status',     'error',
      'error_type', p_error_type
    );
  END IF;

  -- Bereken nieuwe counter-waarden (bij replay: counters ongewijzigd)
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

  -- Atomische update van de playlist-rij
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


-- ─── 2. Grants ────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION update_playlist_video_progress(UUID, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT)
  TO authenticated, service_role;


-- ─── 3. Documentatie ──────────────────────────────────────────────────────────

COMMENT ON FUNCTION update_playlist_video_progress IS
  'Atomic per-video progress update for playlist chain pattern. Zie ADR-025. '
  'Fase 4: credit-deductie (p_amount, p_reason) zit nu in de RPC — atomisch '
  'met video_results update, idempotent via v_already_done check. '
  'Triggert auto-completion (status=''complete'') wanneer completed + failed >= total_videos.';
