-- Google Ads plumbing (ADR-101, no upload/dashboard yet — storage only):
--   * profiles.gclid/gbraid/wbraid + click_id_at — the ad-click identifiers (gbraid/wbraid on iOS) and
--     the arrival moment, so a later server-side conversion upload stays possible. Captured first-touch
--     client-side (AcquisitionCapture), threaded through signup, persisted here ONLY at account creation.
--   * transcription_jobs.first_premium_action — the job-status poll hands this to the frontend so it can
--     fire the Google Ads activation conversion exactly once (server truth: was this the account's first
--     premium action). Set by the pipeline from mark_first_premium_action's result.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS gclid       text,
    ADD COLUMN IF NOT EXISTS gbraid      text,
    ADD COLUMN IF NOT EXISTS wbraid      text,
    ADD COLUMN IF NOT EXISTS click_id_at timestamptz;

COMMENT ON COLUMN public.profiles.gclid IS
    'Google Ads click id from the landing URL (personal data). Captured first-touch, stored only at signup. For later server-side conversion upload; not used yet (ADR-101).';

ALTER TABLE public.transcription_jobs
    ADD COLUMN IF NOT EXISTS first_premium_action boolean;

-- Extend the acquisition trigger to also copy the click identifiers. Reproduces the live body + the
-- four new fields; exception-safe (signup never blocks), first-touch preserved (DO UPDATE only fills NULLs).
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
            signup_source, utm_source, utm_medium, utm_campaign, signup_referrer, signup_landing_path,
            gclid, gbraid, wbraid, click_id_at
        )
        VALUES (
            NEW.id, NEW.email,
            NULLIF(NEW.raw_user_meta_data->>'signup_source', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_source', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''),
            NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
            NULLIF(NEW.raw_user_meta_data->>'signup_referrer', ''),
            NULLIF(NEW.raw_user_meta_data->>'signup_landing_path', ''),
            NULLIF(NEW.raw_user_meta_data->>'gclid', ''),
            NULLIF(NEW.raw_user_meta_data->>'gbraid', ''),
            NULLIF(NEW.raw_user_meta_data->>'wbraid', ''),
            NULLIF(NEW.raw_user_meta_data->>'click_id_at', '')::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
            signup_source       = COALESCE(public.profiles.signup_source, EXCLUDED.signup_source),
            utm_source          = COALESCE(public.profiles.utm_source, EXCLUDED.utm_source),
            utm_medium          = COALESCE(public.profiles.utm_medium, EXCLUDED.utm_medium),
            utm_campaign        = COALESCE(public.profiles.utm_campaign, EXCLUDED.utm_campaign),
            signup_referrer     = COALESCE(public.profiles.signup_referrer, EXCLUDED.signup_referrer),
            signup_landing_path = COALESCE(public.profiles.signup_landing_path, EXCLUDED.signup_landing_path),
            gclid               = COALESCE(public.profiles.gclid, EXCLUDED.gclid),
            gbraid              = COALESCE(public.profiles.gbraid, EXCLUDED.gbraid),
            wbraid              = COALESCE(public.profiles.wbraid, EXCLUDED.wbraid),
            click_id_at         = COALESCE(public.profiles.click_id_at, EXCLUDED.click_id_at);
    EXCEPTION WHEN OTHERS THEN
        -- Acquisition capture must NEVER block signup.
        NULL;
    END;
    RETURN NEW;
END;
$function$;
