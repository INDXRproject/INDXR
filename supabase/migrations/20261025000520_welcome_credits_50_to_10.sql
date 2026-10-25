-- Onderdeel C (growth-plan.md §6.2): welkomstcredits 50 → 10. De 3-minuten gratis voorproefje in
-- de snelle balie (Onderdeel B) is nu het bewijs voor langere bestanden; 10 credits is genoeg voor
-- een korte spraakmemo. Bestaande saldi blijven ongewijzigd (forward-only, geen backfill) — alleen
-- toekomstige claims via deze RPC krijgen 10 i.p.v. 50.
--
-- H10 (growth-plan.md §6.3): dit bestand ontbrak in de repo terwijl de migratie al via de Supabase
-- MCP is toegepast (version 20261025000520 in schema_migrations). De SQL hieronder is exact
-- opnieuw opgehaald uit de live functiedefinitie (pg_get_functiondef) — NIET opnieuw uitgevoerd,
-- alleen vastgelegd zodat repo en database weer in sync zijn.
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
    -- een welkomstgrant op een ander account forceren.
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

    v_new_balance := v_current_balance + 10;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, reason, kind)
    VALUES (p_user_id, 10, 'credit', 'Welcome Reward', 'grant');

    INSERT INTO public.messages (user_id, title, body, type)
    VALUES (
        p_user_id,
        'Welcome to INDXR — 10 free credits added 🎉',
        E'Welcome! We''ve added 10 free credits to your account to get you started — enough to try AI transcription on a short recording, like a voice memo. For longer files, the quick-checkout preview on the Transcribe page shows you the first 3 minutes free before you decide.\n\nExtracting a video''s captions is always free; AI transcription and playlists use credits, and your credits never expire. Paste a YouTube URL on the Transcribe page to begin.\n\nNew here? The quickstart walks you through your first transcript in a few minutes: https://indxr.ai/docs/quickstart',
        'welcome'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
