-- Anti-abuse: welkomst-credits max één keer per CANONIEK e-mailadres.
-- Sluit de Gmail +tag / puntjes-truc (naam+test1@, na.am@ → zelfde inbox = zelfde canoniek adres).
-- Grant-level dedup: accounts blijven geldig (inloggen, gratis captions), alleen de 25-credit
-- welkomst-grant wordt gededupt op canoniek adres. Bestaande accounts ongemoeid (forward-only).
--
-- Keuze grant-level (niet signup-block): breekt geen bestaande accounts en geen legitieme
-- +addressing-gebruikers (die mogen inloggen, krijgen alleen niet twee keer de grant).
-- Race-veilig via pg_advisory_xact_lock op het canonieke adres — geen schema-kolom/backfill nodig.
--
-- EERLIJKE GRENS: dit stopt de +/puntjes-truc, NIET tien écht verschillende mailadressen.
-- Dat is inherent aan een gratis-instapmodel zonder betaalmuur (geaccepteerde grens; zwaardere
-- laag = device-fingerprint / betaalmethode → backlog, niet nu). Zie auth-and-security.md.

CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_email  text := lower(btrim(coalesce(p_email, '')));
    v_local  text;
    v_domain text;
    v_at     int;
BEGIN
    v_at := position('@' in v_email);
    IF v_at = 0 THEN
        RETURN v_email;  -- malformed; lowercased as-is
    END IF;
    v_local  := substring(v_email from 1 for v_at - 1);
    v_domain := substring(v_email from v_at + 1);
    -- strip +tag (sub-addressing): alles vanaf de eerste '+' in het local-part
    v_local := split_part(v_local, '+', 1);
    -- Gmail/Googlemail: puntjes in local-part worden genegeerd, beide domeinen zijn equivalent
    IF v_domain IN ('gmail.com', 'googlemail.com') THEN
        v_local  := replace(v_local, '.', '');
        v_domain := 'gmail.com';
    END IF;
    RETURN v_local || '@' || v_domain;
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
    -- Welkomst-reward max één keer per canoniek adres. +tag/puntjes-aliassen van een adres
    -- dat de grant al kreeg → GEEN tweede grant. We markeren dit profiel wél als claimed
    -- (onboarding retryt niet); het account blijft geldig. Advisory lock serialiseert
    -- concurrent grants voor hetzelfde canonieke adres → race-veilig zonder schema-wijziging.
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
