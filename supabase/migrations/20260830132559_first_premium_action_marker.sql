-- Activation tracking for the Google Ads campaign (ADR-101). profiles.first_premium_action_at records
-- the moment an account first completes a PREMIUM action (AI transcription, AI summary, or a playlist
-- video past the free three) — the campaign optimises on this, not on purchase. It is set exactly once
-- per account, atomically, by mark_first_premium_action: the conditional UPDATE (... WHERE
-- first_premium_action_at IS NULL) means only one concurrent call can win the null->now transition, so
-- the returned boolean is a race-safe "was THIS the account's first premium action". The backend calls
-- it with the service-role client at each premium-action completion and stamps the result on the
-- premium_action_completed PostHog event (is_first_premium_action) — server-side, never client-derived.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_premium_action_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_first_premium_action(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_first boolean;
BEGIN
    UPDATE public.profiles
    SET first_premium_action_at = NOW()
    WHERE id = p_user_id
      AND first_premium_action_at IS NULL;
    -- FOUND is TRUE iff the UPDATE touched a row → this call set the timestamp → first premium action.
    v_first := FOUND;
    RETURN v_first;
END;
$function$;

-- Service-role only (backend). REVOKE from anon/authenticated, not just PUBLIC (LESSONS 2026-07-13):
-- a SECURITY DEFINER function is otherwise callable by any logged-in user via /rest/v1/rpc.
REVOKE ALL ON FUNCTION public.mark_first_premium_action(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_first_premium_action(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.mark_first_premium_action(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_first_premium_action(uuid) TO service_role;
