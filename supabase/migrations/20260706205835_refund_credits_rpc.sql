-- ADR-050 fase 2: refund_credits verrekent aan het eind van een job/playlist de reservering
-- tegen het werkelijke verbruik. refund = credits_reserved - SUM(settlements). Positief =>
-- terugstorten (credit); negatief => best-effort bijbetalen (debit, cap op saldo, transcriptie
-- niet laten falen); 0 => markeer afgerekend. Eén kind='refund'-rij met leesbare reason +
-- structured metadata (datacontract voor de latere refund-UI). Idempotent via de partiële
-- UNIQUE (job_id,'refund') / (playlist_id,'refund'). Correct over ALLE faal-scenario's want
-- afgeleid uit de ledger (settlements) + video_results, neemt geen enkele faal-oorzaak aan.
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_job_id uuid DEFAULT NULL,
  p_playlist_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id         uuid;
    v_reserved        integer;
    v_consumed        integer;
    v_refund          integer;   -- reserved - consumed (negatief = top-up)
    v_total           integer;
    v_failed          integer;
    v_current_balance integer;
    v_applied         integer;   -- werkelijk op de balans toegepast (voor cap)
    v_type            text;
    v_reason          text;
    v_row_id          uuid;
    v_video_results   jsonb;
BEGIN
    IF (p_job_id IS NULL) = (p_playlist_id IS NULL) THEN
        RAISE EXCEPTION 'refund_credits vereist exact één van p_job_id / p_playlist_id';
    END IF;

    -- Reservering + context + werkelijk verbruik ophalen.
    IF p_job_id IS NOT NULL THEN
        SELECT user_id, COALESCE(credits_reserved, 0)
          INTO v_user_id, v_reserved
        FROM public.transcription_jobs WHERE id = p_job_id;
        v_total    := 1;
        v_consumed := COALESCE((SELECT SUM(amount) FROM public.credit_transactions
                                WHERE job_id = p_job_id AND kind = 'settlement'), 0);
        v_failed   := CASE WHEN v_consumed = 0 THEN 1 ELSE 0 END;
    ELSE
        SELECT user_id, COALESCE(credits_reserved, 0), COALESCE(total_videos, 0), COALESCE(video_results, '{}'::jsonb)
          INTO v_user_id, v_reserved, v_total, v_video_results
        FROM public.playlist_extraction_jobs WHERE id = p_playlist_id;
        v_consumed := COALESCE((SELECT SUM(amount) FROM public.credit_transactions
                                WHERE playlist_id = p_playlist_id AND kind = 'settlement'), 0);
        v_failed   := (SELECT count(*) FROM jsonb_each(v_video_results) AS kv(k, val)
                       WHERE val ->> 'status' = 'error');
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'refund_credits: job/playlist-rij niet gevonden (job=%, playlist=%)', p_job_id, p_playlist_id;
    END IF;

    -- Niets gereserveerd (oude modus / 0-reservering) => niets te verrekenen.
    IF v_reserved <= 0 THEN
        RETURN jsonb_build_object('success', true, 'refund', 0, 'noop', true);
    END IF;

    v_refund := v_reserved - v_consumed;
    v_reason := format('Gereserveerd %s → verbruikt %s → %s %s (%s/%s mislukt)',
                       v_reserved, v_consumed, abs(v_refund),
                       CASE WHEN v_refund >= 0 THEN 'teruggestort' ELSE 'bijbetaald' END,
                       v_failed, v_total);

    -- Balans locken.
    INSERT INTO public.user_credits (user_id, credits) VALUES (v_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
    SELECT credits INTO v_current_balance FROM public.user_credits WHERE user_id = v_user_id FOR UPDATE;

    IF v_refund >= 0 THEN
        v_type := 'credit';  v_applied := v_refund;
    ELSE
        v_type := 'debit';   v_applied := LEAST(-v_refund, v_current_balance);  -- cap op saldo
    END IF;

    -- Idempotentie-insert eerst (partiële UNIQUE op (.,'refund')). Al gerefund => niets doen.
    INSERT INTO public.credit_transactions (user_id, amount, type, kind, reason, job_id, playlist_id, metadata)
    VALUES (v_user_id, v_applied, v_type, 'refund', v_reason, p_job_id, p_playlist_id,
            jsonb_build_object('reserved', v_reserved, 'consumed', v_consumed, 'refunded', v_refund,
                               'applied', v_applied, 'failed_count', v_failed, 'total', v_total))
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_row_id;

    IF v_row_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'idempotent', true, 'refund', v_refund);
    END IF;

    -- Balans toepassen (na de idempotentie-check, zodat een retry niet dubbel muteert).
    IF v_refund >= 0 THEN
        UPDATE public.user_credits SET credits = credits + v_applied, updated_at = NOW() WHERE user_id = v_user_id;
    ELSE
        UPDATE public.user_credits SET credits = credits - v_applied, updated_at = NOW() WHERE user_id = v_user_id;
        IF v_applied < -v_refund THEN
            RAISE WARNING 'refund_credits top-up capped: wilde % toegepast % (user %)', -v_refund, v_applied, v_user_id;
        END IF;
    END IF;

    -- credits_refunded op de job-rij (datacontract).
    IF p_job_id IS NOT NULL THEN
        UPDATE public.transcription_jobs SET credits_refunded = v_refund WHERE id = p_job_id;
    ELSE
        UPDATE public.playlist_extraction_jobs SET credits_refunded = v_refund WHERE id = p_playlist_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'reserved', v_reserved, 'consumed', v_consumed,
                              'refund', v_refund, 'applied', v_applied, 'failed', v_failed, 'total', v_total);
END;
$function$;
