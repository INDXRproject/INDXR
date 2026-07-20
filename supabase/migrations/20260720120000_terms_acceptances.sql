-- Clickwrap consent record at checkout. Legal purpose: the Terms (/terms) must be accepted AND
-- reachable BEFORE payment (incorporation), and §7 (loss of the 14-day withdrawal right on first
-- credit use) must rest on an accepted contract. One row per accepted checkout: who, when, which
-- legal-doc version, and the Stripe session it belongs to.
--
-- NOT a finance table: nothing here feeds the credit ledger (credit_transactions/user_credits),
-- cost_config, or the finance RPCs — the audit chain (31/0/0) is untouched. Stripe also retains a
-- copy of the accepted version in session.metadata.termsVersion (durable on Stripe's 7-year
-- financial records even after this row cascades on account deletion).
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at       timestamptz NOT NULL DEFAULT now(),
  terms_version     text        NOT NULL,                        -- legal-doc version (last-updated date) shown
  documents         text[]      NOT NULL DEFAULT ARRAY['terms','privacy'],  -- which docs the checkbox covered
  stripe_session_id text,                                        -- purchase / Stripe Checkout Session ref
  plan              text                                         -- package id the user was buying
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user    ON public.terms_acceptances (user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_session ON public.terms_acceptances (stripe_session_id);

-- RLS: a user sees and writes only their own acceptance. The checkout route runs on the RLS-bound
-- server client (auth.uid() = the buyer), so no service-role bypass is needed.
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own terms acceptances" ON public.terms_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "insert own terms acceptance" ON public.terms_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());
