-- Merge the two welcome inbox messages into one (night-run item 4).
--
-- Before: (1) trigger on_auth_user_created_welcome_message inserted a "Welcome to INDXR" message at
-- signup — before any credits exist (it even said "Your free credits are ready" prematurely); and
-- (2) RPC claim_welcome_reward granted 25 credits at onboarding completion and inserted a SECOND
-- "25 welcome credits added" message. A new user saw two messages.
--
-- After: the trigger + its function are dropped, and claim_welcome_reward inserts ONE merged message
-- at the moment the credits are actually granted (onboarding completion), with the credits worked in,
-- a short wayfinding, and a link to /docs/quickstart. The link is hardcoded to the production marketing
-- host — the SQL equivalent of marketingHref('/docs/quickstart'), since SQL can't call the TS helper.
--
-- ALL credit-granting logic (canonical-email anti-abuse guard, advisory lock, 25-credit grant,
-- credit_transactions audit row, welcome_reward_claimed once-guard) is reproduced UNCHANGED — only
-- the messages INSERT is different.

DROP TRIGGER IF EXISTS on_auth_user_created_welcome_message ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_message();

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

    -- ── Canonical-email anti-abuse (Gmail +tag / dot trick) ─────────────────────
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

    v_new_balance := v_current_balance + 25;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 25, 'credit', 'Welcome Reward', 'grant');

    -- Single merged welcome message (replaces both the old trigger message and the old grant message).
    INSERT INTO public.messages (user_id, title, body, type)
    VALUES (
        p_user_id,
        'Welcome to INDXR — 25 free credits added 🎉',
        E'Welcome! We''ve added 25 free credits to your account to get you started — enough to try AI transcription, run a playlist, or generate a summary.\n\nExtracting a video''s captions is always free; AI transcription and playlists use credits, and your credits never expire. Paste a YouTube URL on the Transcribe page to begin.\n\nNew here? The quickstart walks you through your first transcript in a few minutes: https://indxr.ai/docs/quickstart',
        'welcome'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
