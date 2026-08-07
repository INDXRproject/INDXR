-- ADR-090: settle_credits stempelde hard 'ai_transcription'. Voeg een optionele p_product_type toe
-- (DEFAULT NULL → COALESCE naar 'ai_transcription', dus bestaand transcriptie-gedrag ongewijzigd) zodat
-- de AI-summary-flow zijn settlement correct als 'ai_summary' stempelt. Signature-wijziging → DROP+CREATE.
DROP FUNCTION IF EXISTS public.settle_credits(uuid, integer, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.settle_credits(
    p_user_id uuid,
    p_amount integer,
    p_job_id uuid,
    p_playlist_id uuid DEFAULT NULL::uuid,
    p_video_id text DEFAULT NULL::text,
    p_reason text DEFAULT 'AI transcriptie settlement'::text,
    p_product_type text DEFAULT NULL::text
)
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

    INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, playlist_id, product_type, metadata)
    VALUES (
        p_user_id, p_amount, 'debit', 'settlement', p_reason, p_job_id, p_playlist_id,
        COALESCE(p_product_type, 'ai_transcription'),
        jsonb_build_object('video_id', p_video_id, 'playlist_id', p_playlist_id)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'settled', p_amount, 'idempotent', v_id IS NULL);
END;
$function$;
