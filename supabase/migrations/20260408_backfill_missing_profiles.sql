-- Backfill profile rows for auth users who don't have one.
-- This happens when users are created via API/admin without
-- going through the normal signup flow that triggers handle_new_user_profile().

-- Preview: see which users are missing profiles
-- SELECT au.id, au.email, au.created_at
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON p.id = au.id
-- WHERE p.id IS NULL;

-- Insert missing profile rows with safe defaults
INSERT INTO public.profiles (id, onboarding_completed, suspended)
SELECT au.id, false, false
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
