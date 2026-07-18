-- Privacy-by-design (roadmap 1.32): maak "we delete everything that identifies you" waar.
-- Élk account-delete-pad (nu admin-only, later self-service) loopt via DELETE op auth.users,
-- dus de scrub hoort op auth.users zelf — niet in de app-route (die dekt maar één pad).
-- Zelfde principe als het Decodo-watermark: veiligheid op het niveau waar hij niet te omzeilen is.

-- 1. payment_attempts kreeg tot nu toe GEEN FK naar auth.users → rijen overleefden een delete.
--    Geef 'm een echte ON DELETE CASCADE: rijen mét user_id verdwijnen met de user
--    (bevatten billing_address_country + rauwe Stripe-payload = persoonsgegevens).
--    Pre-auth/geblokkeerde pogingen (user_id NULL) blijven — die horen bij niemand.
ALTER TABLE public.payment_attempts
  ADD CONSTRAINT payment_attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. usage_logs.user_id staat al op SET NULL (de rij = geanonimiseerde metadata die mag blijven),
--    maar ip_address (inet) is een persoonsgegeven onder de AVG. Null het IP vóór de user weg is,
--    via een BEFORE DELETE-trigger op auth.users — vangt elk delete-pad, nu en later.
CREATE OR REPLACE FUNCTION public.scrub_pii_before_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usage_logs
     SET ip_address = NULL
   WHERE user_id = OLD.id
     AND ip_address IS NOT NULL;
  RETURN OLD;
END;
$$;

-- Trigger-functie wordt door de trigger aangeroepen, niet via RPC; toch expliciet dichtzetten
-- (LESSONS 2026-07-13: SECURITY DEFINER altijd REVOKE EXECUTE FROM anon, authenticated).
REVOKE EXECUTE ON FUNCTION public.scrub_pii_before_user_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_scrub_pii_before_user_delete ON auth.users;
CREATE TRIGGER trg_scrub_pii_before_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.scrub_pii_before_user_delete();
