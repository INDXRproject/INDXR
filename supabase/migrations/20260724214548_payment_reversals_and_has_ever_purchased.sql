-- Toegepast via Supabase MCP apply_migration (version 20260724214548) — dit bestand houdt de repo in sync.
--
-- Payment reversals: geld dat TERUGSTROOMT naar de klant (refunds + chargebacks/disputes).
-- WAAROM: de webhook ving alleen geslaagde (checkout.session.completed) en mislukte/geblokkeerde
-- (payment_attempts) betalingen. Teruggedraaid geld — vrijwillige refunds en onvrijwillige
-- chargebacks — bestond nergens in onze data. Gevolg: netto-omzet overschat + geen fraude-/
-- ontevredenheid-signaal. Niet gemeten = permanent verloren (Stripe bewaart het event, onze keten niet).
--
-- TWEE SOORTEN (docs.stripe.com):
--   refund  -> jij/regel geeft geld terug. Event charge.refunded (Charge-object, amount_refunded cumulatief).
--             Stripe geeft de %-fee meestal NIET terug.
--   dispute -> klant betwist via bank (chargeback). Events charge.dispute.created/.closed (Dispute-object).
--             Extra dispute-fee (~EUR 15) bovenop het verloren bedrag, ook bij winst.
--
-- CAPTURE-ONLY (Sprint 1): dit legt de gebeurtenis vast. Verrekenen in de P&L (admin_finance_summary)
-- en credit-clawback-beleid zijn bewuste vervolgstappen -- geen dataverlies, want alles is nu bewaard.

CREATE TABLE IF NOT EXISTS public.payment_reversals (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key                text NOT NULL UNIQUE,      -- 'chg_<charge>' (refund) | 'dsp_<dispute>' (dispute) -> idempotente upsert
  kind                      text NOT NULL,             -- 'refund' | 'dispute'
  occurred_at               timestamptz NOT NULL,      -- Stripe-event-tijd
  status                    text,                      -- refund: succeeded/pending/failed/canceled . dispute: needs_response/under_review/won/lost/...
  reason                    text,                      -- refund.reason of dispute.reason
  amount                    numeric,                   -- teruggestroomd bedrag (major units, zie currency)
  currency                  text,
  fee                       numeric,                   -- extra kost voor ons (dispute-fee); refund meestal geen extra fee -> NULL
  stripe_charge_id          text,
  stripe_payment_intent_id  text,                      -- JOIN-sleutel terug naar credit_transactions.metadata.payment_intent_id
  stripe_refund_id          text,
  stripe_dispute_id         text,
  user_id                   uuid,                      -- best-effort uit charge/PI-metadata (anders later via PI-id joinbaar)
  raw                       jsonb,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_reversals IS
  'Teruggestroomd geld: refunds (charge.refunded) + chargebacks/disputes (charge.dispute.*). Capture-only; '
  'nog niet in de P&L verrekend. Geslaagde betalingen staan in credit_transactions, mislukte in payment_attempts.';

CREATE INDEX IF NOT EXISTS payment_reversals_occurred_idx ON public.payment_reversals (occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_reversals_pi_idx       ON public.payment_reversals (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS payment_reversals_user_idx     ON public.payment_reversals (user_id);

ALTER TABLE public.payment_reversals ENABLE ROW LEVEL SECURITY;
-- Geen policies -> alleen service_role (webhook admin-client) leest/schrijft; anon/authenticated zien niets.
-- (Zelfde patroon als payment_attempts; security-advisor toont dit als INFO rls_enabled_no_policy.)

-- has_ever_purchased: gemaks-/performance-cache van "heeft ooit een Stripe-aankoop gedaan".
-- Paid/free wordt vandaag al live afgeleid uit credit_transactions; deze vlag is een snelkoppeling
-- (bijv. snelle client-side gating). Alleen ECHTE aankopen zetten 'm true -- de webhook doet dat in de
-- checkout.session.completed-tak (niet in add_credits, want die draait ook voor grants/refunds).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_ever_purchased boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.has_ever_purchased IS
  'Cache: true zodra de user >=1 Stripe-aankoop deed. Herafleidbaar uit credit_transactions (stripe_session_id); '
  'gezet door de Stripe-webhook (checkout.session.completed). Geen balans-/financiele bron.';

-- Backfill uit bestaande aankopen (permanent spoor in credit_transactions).
UPDATE public.profiles p
SET has_ever_purchased = true
WHERE p.has_ever_purchased = false
  AND EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = p.id
      AND ct.type = 'credit'
      AND ct.metadata->>'stripe_session_id' IS NOT NULL
  );
