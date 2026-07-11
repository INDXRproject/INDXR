-- Acquisition-source capture on profiles (STAP 7) → revenue/CAC per channel later, queryable from Supabase.
-- Values are first-touch: captured client-side on the first marketing landing (cookie), threaded through
-- signup into auth.users.raw_user_meta_data, then copied to profiles here.
--
-- A SEPARATE, exception-safe trigger is used (NOT a change to handle_new_user, which must never throw and
-- currently only creates user_credits). If acquisition capture fails for any reason, signup is unaffected.
-- profiles is only ever created via upsert(onConflict:'id') in the app (no plain INSERT), so creating the
-- row here at signup with ON CONFLICT DO UPDATE is safe. onboarding_completed defaults false → onboarding
-- flow is unchanged. First-touch is preserved: DO UPDATE only fills acquisition fields that are still NULL.
--
-- ADR-036 keeps auth on the marketing host (indxr.ai), so the first-touch cookie set on the marketing
-- landing is same-host and readable at signup — acquisition does NOT break across the host boundary for
-- the signup event itself. (Anonymous cross-host analytics stitching is a separate PostHog concern.)

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS signup_source        text,
    ADD COLUMN IF NOT EXISTS utm_source           text,
    ADD COLUMN IF NOT EXISTS utm_medium           text,
    ADD COLUMN IF NOT EXISTS utm_campaign          text,
    ADD COLUMN IF NOT EXISTS signup_referrer      text,
    ADD COLUMN IF NOT EXISTS signup_landing_path  text;

COMMENT ON COLUMN public.profiles.signup_source IS
    'First-touch acquisition source at signup (e.g. utm_source value, or ''direct''/''organic''). Captured client-side, threaded via raw_user_meta_data.';

CREATE OR REPLACE FUNCTION public.handle_new_user_acquisition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    BEGIN
        INSERT INTO public.profiles (
            id, email,
            signup_source, utm_source, utm_medium, utm_campaign, signup_referrer, signup_landing_path
        )
        VALUES (
            NEW.id, NEW.email,
            NULLIF(NEW.raw_user_meta_data->>'signup_source', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_source', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
            NULLIF(NEW.raw_user_meta_data->>'signup_referrer', ''),
            NULLIF(NEW.raw_user_meta_data->>'signup_landing_path', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            signup_source       = COALESCE(public.profiles.signup_source, EXCLUDED.signup_source),
            utm_source          = COALESCE(public.profiles.utm_source, EXCLUDED.utm_source),
            utm_medium          = COALESCE(public.profiles.utm_medium, EXCLUDED.utm_medium),
            utm_campaign        = COALESCE(public.profiles.utm_campaign, EXCLUDED.utm_campaign),
            signup_referrer     = COALESCE(public.profiles.signup_referrer, EXCLUDED.signup_referrer),
            signup_landing_path = COALESCE(public.profiles.signup_landing_path, EXCLUDED.signup_landing_path);
    EXCEPTION WHEN OTHERS THEN
        -- Acquisition capture must NEVER block signup.
        NULL;
    END;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_acquisition ON auth.users;
CREATE TRIGGER on_auth_user_created_acquisition
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_acquisition();
