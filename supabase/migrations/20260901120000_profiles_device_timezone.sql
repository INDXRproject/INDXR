-- FIX C: real device timezone on the profile row.
--
-- PostHog only carries $geoip_time_zone (IP-derived → spoofed by any VPN). The real device tz is in
-- every event as $timezone but nowhere on the *account*. Credits/payments live in our DB, not PostHog,
-- so admins need the tz next to them. One column, filled once client-side at onboarding completion
-- (updateProfileAction), shown in the /admin/users table. IANA name, e.g. "Europe/Amsterdam". See
-- ADR-103 / monitoring.md.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_timezone TEXT;
