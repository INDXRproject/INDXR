-- Campaign readiness: raise the welcome grant 25 -> 50 so a new user can transcribe one full
-- recording (e.g. a 40-min lecture) before hitting the confirm screen. Reproduces the exact live
-- claim_welcome_reward body (canonical-email anti-abuse + advisory lock + welcome inbox message,
-- fetched via pg_get_functiondef 2026-08-30); ONLY the two amount literals and the message display
-- text change. Idempotency (welcome_reward_claimed flag under FOR UPDATE + advisory lock + email
-- dedup) is untouched. Grandfather-safe: already-claimed users keep their 25; new users get 50.
-- CREATE OR REPLACE preserves the existing EXECUTE grants (authenticated + service_role; anon revoked).
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
