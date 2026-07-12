-- Blok A: get_user_credits privacy-lek dichten (pre-launch).
--
-- Lek: get_user_credits(p_user_id) is SECURITY DEFINER en accepteerde een willekeurige user-id.
-- Een ingelogde user kon via een directe rpc('get_user_credits', andermans-id)-call het
-- creditsaldo van een ANDERE user opvragen (bewezen: user A las 1339 cr van user B).
--
-- Fix: binnen de functie forceert een authenticated caller zijn EIGEN id via auth.uid();
-- p_user_id wordt dan genegeerd. Alleen service_role (auth.uid() IS NULL — Python-backend,
-- admin) mag nog een andere user lezen via p_user_id. Dat is het bewuste service-pad.
--
-- Caller-map (geverifieerd, grep frontend+backend):
--   AuthContext (browser, auth) ....... eigen user.id  → authenticated  → auth.uid()
--   account/billing page (server, auth)  eigen user.id  → authenticated  → auth.uid()
--   extract/preflight/whisper/playlist   eigen user.id  → authenticated  → auth.uid()
--     routes (server, cookie-client) ...
--   backend/credit_manager.py .......... willekeurige id → service_role   → p_user_id
--   anon .............................. GEEN caller (alle callers gaten achter `if (user)`)
--
-- anon verliest daarom EXECUTE (was ongebruikt); PUBLIC eveneens.

CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id uuid)
 RETURNS TABLE(credits integer, playlist_quota_used integer, playlist_quota_remaining integer, quota_resets_at timestamp with time zone, total_credits_purchased integer, credits_bonus integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid    uuid := auth.uid();
    v_target uuid;
BEGIN
    -- authenticated user → forceer eigen id (negeer p_user_id, sluit cross-user read uit).
    -- service_role / geen JWT (auth.uid() IS NULL) → vertrouwd pad, p_user_id toegestaan.
    IF v_uid IS NOT NULL THEN
        v_target := v_uid;
    ELSE
        v_target := p_user_id;
    END IF;

    IF v_target IS NULL THEN
        RETURN;
    END IF;

    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (v_target, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY
    SELECT
        COALESCE(uc.credits, 0) as credits,
        COALESCE(uc.playlist_quota_used, 0) as playlist_quota_used,
        COALESCE(50 - uc.playlist_quota_used, 50) as playlist_quota_remaining,
        COALESCE(uc.quota_resets_at, NOW() + INTERVAL '1 month') as quota_resets_at,
        COALESCE(uc.total_credits_purchased, 0) as total_credits_purchased,
        COALESCE(uc.credits_bonus, 0) as credits_bonus
    FROM public.user_credits uc
    WHERE uc.user_id = v_target;
END;
$function$;

-- ACL: alleen authenticated (eigen saldo) + service_role (andere user via p_user_id).
REVOKE EXECUTE ON FUNCTION public.get_user_credits(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_credits(uuid) TO authenticated, service_role;
