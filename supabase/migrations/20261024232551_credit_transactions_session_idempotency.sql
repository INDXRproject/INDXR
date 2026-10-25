-- Onderdeel A (growth-plan.md §6.1/§6.2): webhook-idempotentie op DB-niveau.
-- Zonder dit kan een Stripe-webhook-retry (of dubbele delivery) add_credits twee keer laten
-- draaien voor dezelfde checkout.session en zo credits dubbel toekennen. stripe_session_id
-- leeft alleen in credit_transactions.metadata (JSONB) — geen reguliere kolom bestond, dus er
-- kon geen UNIQUE constraint op liggen. Dit voegt een generated column + partial unique index
-- toe (additief, raakt geen bestaande rij) en maakt add_credits() idempotent op die kolom.

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS stripe_session_id text
  GENERATED ALWAYS AS (metadata ->> 'stripe_session_id') STORED;

-- Alleen 'purchase'-rijen zijn Stripe-aankopen; welcome/grant/refund/settlement delen geen
-- session_id, en playlist/whisper reservation-rijen hebben er geen (NULL blijft onbeperkt).
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_purchase_session_uidx
  ON public.credit_transactions (stripe_session_id)
  WHERE kind = 'purchase' AND stripe_session_id IS NOT NULL;

-- add_credits: vang de unique_violation op een herhaalde Stripe-sessie op en geef een
-- "already_processed"-resultaat terug in plaats van de balans opnieuw te muteren. Dit maakt
-- "geen dubbele toekenning" een DB-invariant, niet alleen een applicatie-check (de check-alleen-
-- in-de-app is wat de vorige implementatie deed en expliciet onvoldoende is).
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'Manual credit addition'::text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_kind text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_new_balance := v_current_balance + p_amount;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    BEGIN
        INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata, kind)
        VALUES (p_user_id, p_amount, 'credit', p_reason, p_metadata, p_kind);
    EXCEPTION WHEN unique_violation THEN
        -- Dezelfde Stripe-sessie is al eerder verwerkt (purchase-idempotentie-index hierboven).
        -- De balans-update die net hierboven draaide moet ongedaan gemaakt worden: deze sessie
        -- is al eerder volledig verwerkt (balans + transactie), dus hier niets muteren.
        UPDATE public.user_credits
        SET credits = v_current_balance,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'previous_balance', v_current_balance,
            'new_balance', v_current_balance
        );
    END;

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$function$;
