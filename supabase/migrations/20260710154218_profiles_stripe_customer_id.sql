-- Persistente Stripe Customer-koppeling per user (één Customer per gebruiker).
-- Gebruikt door de Stripe checkout (payment attach) en de on-demand factuurroute
-- (factuur gekoppeld aan één Customer). Additief, nullable, non-breaking.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_uidx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
