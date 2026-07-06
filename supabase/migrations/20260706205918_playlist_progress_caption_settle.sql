-- ADR-050 fase 2: caption-verwerking wordt reservation-aware. Bij een gereserveerde playlist
-- (v_job.credits_reserved > 0 — PLAYLIST-niveau reservering) registreert de RPC een
-- balans-neutrale kind='settlement'-rij i.p.v. de balans af te trekken. Niet-gereserveerd
-- (oude modus): ongewijzigde directe aftrek. Enige wijziging t.o.v. 20260706172045.
CREATE OR REPLACE FUNCTION public.update_playlist_video_progress(p_playlist_id uuid, p_video_id text, p_status text, p_transcript_id uuid DEFAULT NULL::uuid, p_error_type text DEFAULT NULL::text, p_amount integer DEFAULT 0, p_reason text DEFAULT 'Playlist caption extraction'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_job            playlist_extraction_jobs%ROWTYPE;
  v_existing       jsonb;
  v_new_entry      jsonb;
  v_already_done   boolean := false;
  v_new_completed  integer;
  v_new_failed     integer;
  v_is_complete    boolean;
  v_has_retryable  boolean;
  v_new_status     text;
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

  -- Credit-verwerking: settlement (reservation-mode) OF directe aftrek (oude modus),
  -- atomisch met de progress-update, beschermd door v_already_done (per-video idempotent).
  IF NOT v_already_done AND p_status = 'success' AND p_amount > 0 THEN
    IF COALESCE(v_job.credits_reserved, 0) > 0 THEN
      -- Reservation-mode: balans is al bij reserve bewogen -> balans-neutrale settlement.
      -- kind='settlement' is uitgezonderd van de (playlist_id,kind) UNIQUE (M4): meervoudig OK.
      INSERT INTO credit_transactions (user_id, amount, type, kind, reason, playlist_id, metadata)
      VALUES (
        v_job.user_id, p_amount, 'debit', 'settlement', p_reason, p_playlist_id,
        jsonb_build_object('playlist_id', p_playlist_id, 'video_id', p_video_id)
      );
    ELSE
      -- Oude modus (niet gereserveerd): directe aftrek, ongewijzigd gedrag.
      UPDATE user_credits
      SET credits    = credits - p_amount,
          updated_at = NOW()
      WHERE user_id = v_job.user_id;

      INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)
      VALUES (
        v_job.user_id, p_amount, 'debit', p_reason,
        jsonb_build_object('playlist_id', p_playlist_id, 'video_id', p_video_id)
      );
    END IF;
  END IF;

  IF p_status = 'success' THEN
    v_new_entry := jsonb_build_object('status', 'success', 'transcript_id', p_transcript_id);
  ELSE
    v_new_entry := jsonb_build_object('status', 'error', 'error_type', p_error_type);
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

  IF v_is_complete THEN
    v_has_retryable := EXISTS (
      SELECT 1
      FROM jsonb_each(v_job.video_results || jsonb_build_object(p_video_id, v_new_entry)) AS kv(key, val)
      WHERE kv.val ->> 'status' = 'error'
        AND kv.val ->> 'error_type' IN ('bot_detection', 'timeout')
    );
    v_new_status := CASE WHEN v_has_retryable THEN 'retry_pending' ELSE 'complete' END;
  ELSE
    v_new_status := v_job.status;
  END IF;

  UPDATE playlist_extraction_jobs SET
    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),
    completed        = v_new_completed,
    failed           = v_new_failed,
    last_progress_at = NOW(),
    status           = v_new_status,
    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,
    processing_time_seconds = CASE
      WHEN v_is_complete
      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer
      ELSE processing_time_seconds
    END
  WHERE id = p_playlist_id;

  RETURN jsonb_build_object(
    'playlist_complete', v_is_complete,
    'should_retry',      v_is_complete AND v_has_retryable,
    'completed',         v_new_completed,
    'failed',            v_new_failed,
    'total',             v_job.total_videos
  );
END;
$function$;
