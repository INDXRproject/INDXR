-- Credit `kind` stamping so purchased/granted/welcome/refund become cleanly separable.
-- Root cause today: add_credits never sets `kind` → every purchase/grant/welcome/refund credit
-- row lands with kind=NULL, so "Credits Purchased" conflates Stripe purchases + admin grants +
-- welcome bonuses. This migration:
--   (1) widens the kind CHECK to allow 'welcome' (was reservation|settlement|refund|purchase|grant|bonus);
--   (2) adds p_kind to add_credits (drop+recreate — a new param changes the signature; done inside this
--       migration transaction so there is no live gap). Body is byte-identical to the current function
--       except the extra column on the INSERT. EXECUTE grants are re-applied to match the prior ACL
--       (anon|authenticated|service_role|PUBLIC) — the security posture is PRESERVED, not changed.
--       NB: that authenticated/anon can EXECUTE add_credits directly is a PRE-EXISTING concern flagged
--       separately; this migration intentionally does NOT alter it.
--   (3) stamps claim_welcome_reward's row with kind='welcome' (same signature → plain REPLACE).
-- No historical backfill (Stripe rows already identifiable via metadata.stripe_session_id; 1.26 wipes test noise).

-- (1) Widen the kind CHECK (adding an allowed value only widens → all existing rows still satisfy it).
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_kind_check;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_kind_check
    CHECK (kind IS NULL OR kind = ANY (ARRAY[
        'reservation'::text, 'settlement'::text, 'refund'::text,
        'purchase'::text, 'grant'::text, 'bonus'::text, 'welcome'::text
    ]));

-- (2) add_credits with p_kind
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text, jsonb);

CREATE FUNCTION public.add_credits(
    p_user_id uuid,
    p_amount integer,
    p_reason text DEFAULT 'Manual credit addition'::text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_kind text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock the user_credits row
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Add credits
    v_new_balance := v_current_balance + p_amount;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction with metadata + kind classification
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata, kind)
    VALUES (p_user_id, p_amount, 'credit', p_reason, p_metadata, p_kind);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$function$;

-- Preserve the prior EXECUTE ACL exactly (do not change security posture).
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, jsonb, text)
    TO anon, authenticated, service_role;

-- (3) claim_welcome_reward stamps kind='welcome'
CREATE OR REPLACE FUNCTION public.claim_welcome_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- 1. Lock the profile row to prevent race conditions
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    -- 2. Check existence
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;
    -- 3. Check if already claimed
    IF v_profile.welcome_reward_claimed THEN
         RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
    END IF;
    -- 4. Mark as claimed
    UPDATE public.profiles
    SET welcome_reward_claimed = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 5. Add Credits (Inlined Logic to avoid function ambiguity)
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
    -- Log transaction (kind='welcome' so welcome bonuses are separable from grants/purchases)
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 25, 'credit', 'Welcome Reward', 'welcome');
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
