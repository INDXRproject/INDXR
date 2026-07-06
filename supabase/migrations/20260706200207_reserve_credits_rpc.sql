-- reserve_credits (ADR-050 gedrags-fase 1/3): reserveert bij job-start het volledige
-- geschatte bedrag als ECHTE aftrek op user_credits.credits, zodat gereserveerde credits
-- onbeschikbaar zijn voor concurrent jobs (sluit de overspend-race). Gemodelleerd op
-- deduct_credits_atomic. Idempotent via de partiële UNIQUE-indexen (job_id,kind)/
-- (playlist_id,kind). Settle/refund komen in latere fasen.
CREATE OR REPLACE FUNCTION public.reserve_credits(
  p_user_id uuid,
  p_amount integer,
  p_job_id uuid DEFAULT NULL,
  p_playlist_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Credit reservation'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance     INTEGER;
    v_inserted_id     UUID;
    v_rows            INTEGER;
BEGIN
    -- Precondition: exact één job-referentie.
    IF (p_job_id IS NULL) = (p_playlist_id IS NULL) THEN
        RAISE EXCEPTION 'reserve_credits vereist exact één van p_job_id / p_playlist_id (job_id=%, playlist_id=%)',
            p_job_id, p_playlist_id;
    END IF;

    -- No-op bij nul/negatief (bv. caption-playlist met <= 3 gratis video's): niets muteren.
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', true, 'reserved', 0, 'noop', true);
    END IF;

    -- Zorg dat de user_credits-rij bestaat en lock 'm (serialiseert concurrent reserves).
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Idempotentie-insert EERST: de partiële UNIQUE (job_id,kind)/(playlist_id,kind) vangt
    -- een retry van dezelfde job af. Geen rij terug => al gereserveerd => niet nog eens aftrekken.
    INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, playlist_id, metadata)
    VALUES (
        p_user_id, p_amount, 'debit', 'reservation', p_reason, p_job_id, p_playlist_id,
        jsonb_build_object('job_id', p_job_id, 'playlist_id', p_playlist_id)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NULL THEN
        -- Al gereserveerd (idempotente retry) — geen dubbele aftrek.
        RETURN jsonb_build_object(
            'success', true, 'reserved', p_amount, 'idempotent', true, 'new_balance', v_current_balance
        );
    END IF;

    -- Nieuwe reservering: saldocheck. Onvoldoende => reservering-rij ongedaan maken en
    -- schoon hard-falen (niets afgetrokken, balans onaangeroerd).
    IF v_current_balance < p_amount THEN
        DELETE FROM public.credit_transactions WHERE id = v_inserted_id;
        RETURN jsonb_build_object(
            'success', false, 'error', 'insufficient_credits',
            'required', p_amount, 'available', v_current_balance
        );
    END IF;

    -- Voldoende saldo: reserveren = echt aftrekken.
    v_new_balance := v_current_balance - p_amount;
    UPDATE public.user_credits
    SET credits = v_new_balance, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Zet credits_reserved op de juiste job-tabel. Ontbrekende job-rij => alles terugrollen.
    IF p_job_id IS NOT NULL THEN
        UPDATE public.transcription_jobs SET credits_reserved = p_amount WHERE id = p_job_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSE
        UPDATE public.playlist_extraction_jobs SET credits_reserved = p_amount WHERE id = p_playlist_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    END IF;

    IF v_rows = 0 THEN
        RAISE EXCEPTION 'reserve_credits: job-rij niet gevonden (job_id=%, playlist_id=%) — reservering moet aan een echte job hangen',
            p_job_id, p_playlist_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 'reserved', p_amount,
        'previous_balance', v_current_balance, 'new_balance', v_new_balance
    );
END;
$function$;
