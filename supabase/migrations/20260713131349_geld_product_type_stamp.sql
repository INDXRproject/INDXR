-- ETAPPE 1 (GELD) — Beslissing #1: PRODUCT_TYPE-STEMPEL
-- Leaf COR-types die credits consumeren: ai_transcription / ai_summary / rag / caption.
-- 'playlist' is BEWUST GEEN leaf-type: een playlist is een composiet (playlist_id IS NOT NULL)
-- over caption- + ai_transcription-videos. COR-per-type leest de leaf-stempel; de playlist-view
-- is afgeleid via playlist_id. (Zie STAP-0-rapport: playlist is geen schone COR-bucket.)
--
-- Ontwerp met LAAGSTE risico op de hot financiële RPC's: GEEN signature-wijzigingen.
--   settle_credits            -> stempelt zelf 'ai_transcription'
--   update_playlist_video_progress -> stempelt zelf 'caption'
--   deduct_credits_atomic     -> leest de stempel uit de bestaande p_metadata jsonb ('product_type')
-- Alle drie blijven CREATE OR REPLACE (identieke signature) => ACL/GRANTs blijven intact,
-- geen DROP, geen re-GRANT.

-- 1) Kolom + CHECK (NULL toegestaan: grants/purchases/reserveringen/refunds dragen geen product_type)
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS product_type text;

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_product_type_check;
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_product_type_check
  CHECK (product_type IS NULL OR product_type IN ('ai_transcription','ai_summary','rag','caption'));

-- 2) Historische backfill (EENMALIG, via reason-mapping — de enige signal die bestaande rijen dragen).
--    Alleen consumptie-rijen (type='debit'). Volgorde: specifiek vóór generiek.
UPDATE public.credit_transactions
SET product_type = 'rag'
WHERE type = 'debit' AND product_type IS NULL
  AND (reason ILIKE '%RAG%');

UPDATE public.credit_transactions
SET product_type = 'ai_summary'
WHERE type = 'debit' AND product_type IS NULL
  AND (reason ILIKE '%summar%' OR reason ILIKE '%samenvat%');

UPDATE public.credit_transactions
SET product_type = 'caption'
WHERE type = 'debit' AND product_type IS NULL
  AND (reason ILIKE '%playlist caption%' OR reason ILIKE '%caption extraction%');

UPDATE public.credit_transactions
SET product_type = 'ai_transcription'
WHERE type = 'debit' AND product_type IS NULL
  AND (reason ILIKE '%assemblyai%'
       OR reason ILIKE '%ai transcriptie%'
       OR reason ILIKE '%ai transcription%'
       OR reason ILIKE '%whisper%');

-- 3) settle_credits: identieke signature + body, met product_type='ai_transcription' in de INSERT.
CREATE OR REPLACE FUNCTION public.settle_credits(p_user_id uuid, p_amount integer, p_job_id uuid, p_playlist_id uuid DEFAULT NULL::uuid, p_video_id text DEFAULT NULL::text, p_reason text DEFAULT 'AI transcriptie settlement'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    IF p_job_id IS NULL THEN
        RAISE EXCEPTION 'settle_credits vereist p_job_id (whisper-video job)';
    END IF;
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', true, 'settled', 0, 'noop', true);
    END IF;

    -- Idempotent via (job_id,'settlement'). playlist_id wordt meegeschreven zodat de
    -- playlist-refund de whisper-in-playlist-settlements meesomt (SUM WHERE playlist_id).
    INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, playlist_id, product_type, metadata)
    VALUES (
        p_user_id, p_amount, 'debit', 'settlement', p_reason, p_job_id, p_playlist_id, 'ai_transcription',
        jsonb_build_object('video_id', p_video_id, 'playlist_id', p_playlist_id)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;

    -- BEWUST geen user_credits-mutatie: balans-neutraal.
    RETURN jsonb_build_object('success', true, 'settled', p_amount, 'idempotent', v_id IS NULL);
END;
$function$;

-- 4) deduct_credits_atomic: identieke signature + body, met product_type uit p_metadata->>'product_type'.
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the user_credits row to prevent race conditions
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user credits record exists
    IF NOT FOUND THEN
        -- Create credits record if it doesn't exist
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
        v_current_balance := 0;
    END IF;

    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_current_balance
        );
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_amount;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction (product_type gestempeld door de caller via p_metadata->>'product_type')
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, product_type, metadata)
    VALUES (p_user_id, p_amount, 'debit', p_reason, p_metadata->>'product_type', p_metadata);

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_deducted', p_amount
    );
END;
$function$;

-- 5) update_playlist_video_progress: identieke signature + body, product_type='caption' in BEIDE INSERTs.
CREATE OR REPLACE FUNCTION public.update_playlist_video_progress(p_playlist_id uuid, p_video_id text, p_status text, p_transcript_id uuid DEFAULT NULL::uuid, p_error_type text DEFAULT NULL::text, p_amount integer DEFAULT 0, p_reason text DEFAULT 'Playlist caption extraction'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_job            playlist_extraction_jobs%ROWTYPE;
  v_existing       jsonb;
  v_new_entry      jsonb;
  v_already_done   boolean := false;
  v_prev_status    text;
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
  v_prev_status := v_existing ->> 'status';
  IF v_existing IS NOT NULL AND v_prev_status = p_status THEN
    v_already_done := true;
  END IF;

  IF NOT v_already_done AND p_status = 'success' AND p_amount > 0 THEN
    IF COALESCE(v_job.credits_reserved, 0) > 0 THEN
      INSERT INTO credit_transactions (user_id, amount, type, kind, reason, playlist_id, product_type, metadata)
      VALUES (
        v_job.user_id, p_amount, 'debit', 'settlement', p_reason, p_playlist_id, 'caption',
        jsonb_build_object('playlist_id', p_playlist_id, 'video_id', p_video_id)
      );
    ELSE
      UPDATE user_credits
      SET credits    = credits - p_amount,
          updated_at = NOW()
      WHERE user_id = v_job.user_id;

      INSERT INTO credit_transactions (user_id, amount, type, reason, product_type, metadata)
      VALUES (
        v_job.user_id, p_amount, 'debit', p_reason, 'caption',
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
    v_new_completed := GREATEST(0, v_job.completed
      + (CASE WHEN p_status = 'success' THEN 1 ELSE 0 END)
      - (CASE WHEN v_prev_status = 'success' THEN 1 ELSE 0 END));
    v_new_failed := GREATEST(0, v_job.failed
      + (CASE WHEN p_status <> 'success' THEN 1 ELSE 0 END)
      - (CASE WHEN v_prev_status IS NOT NULL AND v_prev_status <> 'success' THEN 1 ELSE 0 END));
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
