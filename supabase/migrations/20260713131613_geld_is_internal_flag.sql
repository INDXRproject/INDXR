-- ETAPPE 1 (GELD) — Beslissing #2: INTERNE/TEST-ACCOUNTS UITFILTEREN
-- is_internal leeft op profiles (identiteits-niveau, naast suspended/email/signup_source).
-- Élk dashboard-cijfer sluit is_internal=true uit, zodat test-verkeer de echte economie niet
-- vervuilt (lost het "99% granted"-artefact op). Khidr kan de lijst later uitbreiden met
--   UPDATE public.profiles SET is_internal=true WHERE id=(SELECT id FROM auth.users WHERE email='...');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Seed: Khidr's eigen accounts + CC's testaccounts + test-domein-patronen.
-- Via auth.users.email (gezaghebbend), robuust ongeacht of profiles.email gevuld is.
UPDATE public.profiles p
SET is_internal = true
FROM auth.users u
WHERE u.id = p.id
  AND (
        u.email = 'mbelabas@protonmail.com'
     OR u.email = 'inkofknowledge@proton.me'
     OR u.email LIKE 'contact%@indxr.ai'
     OR u.email LIKE '%@indxr-test.com'
     OR u.email LIKE '%@example.invalid'
     OR u.email LIKE '%@example.com'
  );

COMMENT ON COLUMN public.profiles.is_internal IS
  'True = intern/test-account; uitgesloten van ALLE admin-dashboard financiële cijfers (ETAPPE 1 GELD, beslissing #2).';
