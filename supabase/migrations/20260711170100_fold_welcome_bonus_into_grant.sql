-- Blok E: vereenvoudig de bijschrijf-kant (type='credit') naar EXACT 3 kinds → purchase | grant | refund.
-- 'welcome' (nooit gebruikt in prod) én de 4 legacy 'bonus'-rijen (backfill-classificatie uit
-- 20260706190216, geen actieve stamper) vouwen terug in 'grant' — start-, welkomst- en feedback/bug-
-- beloningen zijn allemaal grants. Balans-neutraal (alleen classificatie, geen amount/type-mutatie).
-- Bestaande 'grant'-rijen blijven ongemoeid (deze UPDATE voegt alleen toe).

UPDATE public.credit_transactions SET kind = 'grant' WHERE kind IN ('welcome', 'bonus');

-- CHECK terug naar de debit-kinds (reservation|settlement) + de 3 credit-kinds (refund|purchase|grant).
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_kind_check;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_kind_check
    CHECK (kind IS NULL OR kind = ANY (ARRAY[
        'reservation'::text, 'settlement'::text, 'refund'::text, 'purchase'::text, 'grant'::text
    ]));

-- claim_welcome_reward stempelt voortaan kind='grant' (was 'welcome'); search_path gepind (hardening).
-- CREATE OR REPLACE behoudt de bestaande EXECUTE-grants; de privilege-lockdown (Blok A) revoke't
-- daarna anon/PUBLIC en houdt authenticated (de server-action-caller) + service_role.
CREATE OR REPLACE FUNCTION public.claim_welcome_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;
    IF v_profile.welcome_reward_claimed THEN
         RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
    END IF;
    UPDATE public.profiles
    SET welcome_reward_claimed = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_new_balance := v_current_balance + 25;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    -- kind='grant': welkomst-beloning is een grant (bijschrijf-kant = purchase|grant|refund).
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 25, 'credit', 'Welcome Reward', 'grant');
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
