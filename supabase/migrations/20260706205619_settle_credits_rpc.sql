-- ADR-050 fase 2: settle_credits registreert het WERKELIJKE verbruik van één succesvolle
-- (whisper-)video als kind='settlement'-rij. BALANS-NEUTRAAL: de balans is al bij reserve
-- bewogen; settle is een consumptie-registratie (audit + som-bron voor de refund). Idempotent
-- via de bestaande (job_id,'settlement') UNIQUE (job_id is per-video uniek). Caption-settlement
-- loopt NIET hierlangs maar via update_playlist_video_progress (v_already_done-guard).
CREATE OR REPLACE FUNCTION public.settle_credits(
  p_user_id uuid,
  p_amount integer,
  p_job_id uuid,
  p_playlist_id uuid DEFAULT NULL,
  p_video_id text DEFAULT NULL,
  p_reason text DEFAULT 'AI transcriptie settlement'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, playlist_id, metadata)
    VALUES (
        p_user_id, p_amount, 'debit', 'settlement', p_reason, p_job_id, p_playlist_id,
        jsonb_build_object('video_id', p_video_id, 'playlist_id', p_playlist_id)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;

    -- BEWUST geen user_credits-mutatie: balans-neutraal.
    RETURN jsonb_build_object('success', true, 'settled', p_amount, 'idempotent', v_id IS NULL);
END;
$function$;
