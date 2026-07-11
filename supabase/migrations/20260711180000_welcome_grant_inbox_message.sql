-- Blok A: welkomst-25-credits verhuist van de transcribe-card naar de messages-inbox.
-- claim_welcome_reward insert nu OOK een service-type inbox-bericht, ATOMISCH met de grant en binnen
-- dezelfde welcome_reward_claimed-guard → credits + bericht landen samen, EXACT één keer. Faalt de
-- message-insert, dan rolt de hele transactie terug (geen halve grant) en kan een retry het opnieuw doen.
-- De RPC wordt voortaan auto-aangeroepen bij onboarding-completion (updateProfileAction), niet meer via
-- een handmatige card-klik. type='service' (service-mededeling), read=false (unread-indicator), sender_role
-- default 'admin'. Rest van de functie ongewijzigd (kind='grant', search_path gepind, grants behouden).

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

    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 25, 'credit', 'Welcome Reward', 'grant');

    -- Inbox-mededeling (atomisch met de grant; exact één keer door de guard hierboven).
    INSERT INTO public.messages (user_id, title, body, type)
    VALUES (
        p_user_id,
        '25 welcome credits added 🎉',
        E'We''ve added 25 free credits to your account to get you started.\n\nCaptions are always free; AI transcription and playlists use credits. Paste a YouTube URL on the Transcribe page to begin.',
        'service'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
