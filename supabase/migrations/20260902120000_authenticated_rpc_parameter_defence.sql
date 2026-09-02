-- Parameter-defence op de authenticated-callable SECURITY DEFINER-RPC's (security-audit nazorg, 2026-09-02).
-- De EXECUTE-grant zegt WIE mag bellen, niet WAT hij mag vragen. Bewezen met echte REST-calls als test1:
--   • deduct_credits_atomic accepteerde een ANDERE user_id (cross-user) én een NEGATIEF bedrag drukte
--     credits bij (436 -> 536, want balance - (-x) = balance + x); nul-bedrag werd geaccepteerd.
--   • claim_welcome_reward verwerkte een vreemde p_user_id (kon een welkomstgrant op een ander account forceren).
--   • library_storage_is_full gaf de opslagstatus van een andere user terug.
-- Fix = get_user_credits-patroon: auth.uid() is DWINGEND voor een authenticated caller; alleen service_role
-- (auth.uid() IS NULL) mag een arbitraire p_user_id kiezen (het bedoelde servicepad). Plus een strikt-positief-
-- bedrag-guard op deduct_credits_atomic. Alleen body-guards toegevoegd; de rest van elke body is byte-identiek
-- aan pg_get_functiondef vóór de wijziging (geverifieerd na apply). Toegepast via Supabase MCP op 2026-09-02.

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
    -- Parameter-defence (audit 2026-09-02): authenticated caller raakt ALLEEN zijn eigen rij (auth.uid() wint);
    -- alleen service_role (auth.uid() IS NULL) mag een arbitraire p_user_id targeten. Een debit MOET strikt
    -- positief zijn: negatief drukt credits bij (balance - (-x) = balance + x), nul maakt een lege debit-rij.
    p_user_id := COALESCE(auth.uid(), p_user_id);
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid amount', 'required', p_amount);
    END IF;

    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
        v_current_balance := 0;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_current_balance
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, reason, product_type, metadata)
    VALUES (p_user_id, p_amount, 'debit', p_reason, p_metadata->>'product_type', p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_deducted', p_amount
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_welcome_reward(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_email TEXT;
    v_canon TEXT;
BEGIN
    -- Parameter-defence (audit 2026-09-02): authenticated caller claimt ALLEEN zijn eigen reward (auth.uid()
    -- wint); alleen service_role (auth.uid() IS NULL) mag p_user_id kiezen. Zonder dit kon elke ingelogde user
    -- een welkomstgrant (50 credits) op een ander account forceren.
    p_user_id := COALESCE(auth.uid(), p_user_id);

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

    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
    v_canon := public.normalize_email(v_email);
    PERFORM pg_advisory_xact_lock(hashtext('welcome_grant:' || v_canon));
    IF EXISTS (
        SELECT 1
        FROM public.credit_transactions ct
        JOIN auth.users u2 ON u2.id = ct.user_id
        WHERE ct.type = 'credit'
          AND ct.reason ILIKE '%welcome%'
          AND ct.user_id <> p_user_id
          AND public.normalize_email(u2.email) = v_canon
    ) THEN
        UPDATE public.profiles
        SET welcome_reward_claimed = TRUE, updated_at = NOW()
        WHERE id = p_user_id;
        RETURN jsonb_build_object('success', false, 'error', 'Welcome reward already claimed for this email');
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

    v_new_balance := v_current_balance + 50;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 50, 'credit', 'Welcome Reward', 'grant');

    INSERT INTO public.messages (user_id, title, body, type)
    VALUES (
        p_user_id,
        'Welcome to INDXR — 50 free credits added 🎉',
        E'Welcome! We''ve added 50 free credits to your account to get you started — enough to try AI transcription, run a playlist, or generate a summary.\n\nExtracting a video''s captions is always free; AI transcription and playlists use credits, and your credits never expire. Paste a YouTube URL on the Transcribe page to begin.\n\nNew here? The quickstart walks you through your first transcript in a few minutes: https://indxr.ai/docs/quickstart',
        'welcome'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.library_storage_is_full(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- Parameter-defence (audit 2026-09-02): authenticated caller ziet ALLEEN zijn eigen opslagstatus;
    -- alleen service_role (auth.uid() IS NULL) mag p_user_id kiezen.
    SELECT COALESCE(uc.library_bytes, 0)
             >= COALESCE(uc.library_bytes_cap, 0) + COALESCE(uc.library_bytes_bonus, 0)
    FROM public.user_credits uc
    WHERE uc.user_id = COALESCE(auth.uid(), p_user_id);
$function$;

-- CREATE OR REPLACE op dezelfde signatuur behoudt grants; expliciet herbevestigen (belt-and-braces,
-- model get_user_credits): authenticated + service_role mogen EXECUTE, PUBLIC/anon niet.
REVOKE EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.claim_welcome_reward(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_welcome_reward(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.library_storage_is_full(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.library_storage_is_full(uuid) TO authenticated, service_role;
