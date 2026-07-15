-- Payment-attempt log + Radar fee-rate config.
--
-- WAAROM: de webhook luistert nu alleen op checkout.session.completed → mislukte en Radar-geblokkeerde
-- pogingen bestaan niet in onze data. Dat is (a) een kostendriver (Radar rekent €0,02 per gescreende
-- poging, ook geblokkeerde) en (b) de enige manier om te zien dát de landguard werkt: bij een block uit
-- GB verwachten we hier een rij met outcome_type='blocked' + de rule-id. Niet gemeten = verloren.
--
-- CAPTURE-EVENT (geverifieerd tegen docs.stripe.com): een Radar-block MAAKT een failed Charge → zowel
-- payment_intent.payment_failed als charge.failed vuren. Het `outcome` (incl. outcome.rule) staat INLINE
-- op charge.failed, NIET op het PaymentIntent-event. Daarom loggen we op charge.failed (rijk, screened=true);
-- payment_intent.payment_failed vult alleen pre-charge-failures aan (geen charge → screened=false).

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at              timestamptz NOT NULL,            -- Stripe-event-tijd (poging-tijdstip)
  stripe_charge_id         text,                            -- aanwezig ⇒ Radar heeft gescreend (screened)
  stripe_payment_intent_id text,
  outcome_type             text,   -- blocked | issuer_declined | invalid | manual_review | authorized
  outcome_reason           text,   -- rule | highest_risk_level | ...
  outcome_rule             text,   -- Radar rule-id (bare in de webhook; predicate via expand)
  outcome_rule_predicate   text,   -- expanded regeltekst (best-effort)
  risk_level               text,
  billing_address_country  text,   -- hetzelfde veld dat Stripe Tax gebruikt → geen gat guard vs belasting
  payment_method_type      text,
  decline_code             text,
  amount                   numeric,
  currency                 text,
  screened                 boolean NOT NULL DEFAULT false,  -- true ⇒ er was een charge ⇒ Radar-fee telt
  user_id                  uuid,                            -- uit PI-metadata indien aanwezig
  raw                      jsonb,                           -- outcome + salient velden, forensisch
  created_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_attempts IS
  'Mislukte/geblokkeerde betaalpogingen (charge.failed + charge-loze payment_intent.payment_failed). '
  'Kostendriver (Radar-screens) én detectie van de landguard. Geslaagde pogingen staan in credit_transactions.';

-- Dedupe: charge.failed en payment_intent.payment_failed kunnen dezelfde charge dragen → één rij per charge.
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_charge_uniq
  ON public.payment_attempts (stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_attempts_occurred_idx ON public.payment_attempts (occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_attempts_country_idx  ON public.payment_attempts (billing_address_country);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
-- Geen policies → alleen service_role (webhook admin-client + finance-RPC) leest/schrijft; anon/authenticated zien niets.

-- Radar-tarief in cost_config, naast de andere unit-rates. €0,02 = het Radar-for-Fraud-Teams
-- standaard-pricing-tarief (custom rules vereisen RfFT; base-Radar-ML is gratis). Vrij t/m radar_free_until
-- (free trial) → pogingen vóór die datum kosten €0.
ALTER TABLE public.cost_config
  ADD COLUMN IF NOT EXISTS radar_eur_per_screen numeric(12,6) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS radar_free_until      date          DEFAULT '2026-08-15';

COMMENT ON COLUMN public.cost_config.radar_eur_per_screen IS
  'EUR per Radar-gescreende poging (successful+declined+blocked). RfFT standaard-pricing = 0.02.';
COMMENT ON COLUMN public.cost_config.radar_free_until IS
  'Radar free-trial einddatum: pogingen vóór deze datum worden niet gefactureerd (fee 0).';
