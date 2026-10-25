-- Onderdeel B (growth-plan.md §6.2): snelle balie — anonieme upload → offerte → voorproefje →
-- betalen per bestand, zonder account. Additief: geen bestaande kolom/rij gewijzigd.

-- ── quick_quotes: offerte-opslag vóór betaling ──────────────────────────────────────────────
-- Legt duur+prijs vast op offerte-moment (nooit meer afschrijven dan geoffreerd) en overleeft
-- een Stripe-redirect (het bestand staat al in R2, niet in browser-geheugen). Geen RLS-policy's:
-- alleen service-role (backend + Next.js webhook/route) muteert deze tabel; een publiek
-- access_token (niet de PK) beveiligt de klant-zichtbare statuspagina.
CREATE TABLE public.quick_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    access_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '30 minutes') NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending | paid | expired | failed
    email text, -- NULL tot Stripe Checkout het invult (customer_details.email)
    ip_hash text, -- voor abuse-limieten (max open quotes per IP); geen raw IP opgeslagen
    files jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{r2_key, filename, duration_seconds, credits, price_cents, preview_text}]
    total_credits integer NOT NULL DEFAULT 0,
    total_price_cents integer NOT NULL DEFAULT 0,
    stripe_session_id text,
    claimed_by_user_id uuid REFERENCES auth.users(id),
    CONSTRAINT quick_quotes_status_check CHECK (status IN ('pending', 'paid', 'expired', 'failed'))
);

CREATE UNIQUE INDEX quick_quotes_access_token_uidx ON public.quick_quotes (access_token);
CREATE INDEX quick_quotes_expires_at_idx ON public.quick_quotes (expires_at) WHERE status = 'pending';
CREATE UNIQUE INDEX quick_quotes_stripe_session_uidx ON public.quick_quotes (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.quick_quotes ENABLE ROW LEVEL SECURITY;
-- Geen policies: anon/authenticated hebben GEEN directe toegang (RLS aan + 0 policies = alles
-- dicht). Alle toegang loopt via service-role (backend Railway + Next.js admin-client) of de
-- losse publieke statusroute, die het access_token zelf server-side valideert.
REVOKE ALL ON public.quick_quotes FROM anon, authenticated;

-- ── Guest-accounts (Eén grootboek — geen tweede ledger) ─────────────────────────────────────
-- Een anonieme koper krijgt een ECHTE Supabase Auth-user (admin.createUser, geen wachtwoord) op
-- het e-mailadres uit Checkout, zodat credits/jobs de bestaande user_credits/transcription_jobs-
-- infrastructuur gebruiken. is_guest onderscheidt dit van een normale signup (UI-banner
-- "claim your account"); zet zichzelf op false bij de eerste succesvolle login/password-set.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;

-- ── Secure transcript-link voor anonieme/guest-kopers ────────────────────────────────────────
-- Leesbaar via een server-side route die dit token valideert en met service-role ophaalt (de
-- key gaat nooit naar de client) — geen RLS-policy op basis van het token nodig.
ALTER TABLE public.transcripts ADD COLUMN IF NOT EXISTS guest_access_token text;
CREATE UNIQUE INDEX IF NOT EXISTS transcripts_guest_access_token_uidx
  ON public.transcripts (guest_access_token) WHERE guest_access_token IS NOT NULL;

-- ── Canonical-email account-lookup (hergebruikt ADR-024's normalize_email) ──────────────────
-- Vóór een nieuwe guest wordt aangemaakt: bestaat er al een account (guest of echt) op dit
-- canonieke adres? Zo ja, crediteer DAT account — geen dubbel account per +tag/puntjes-alias.
-- SECURITY DEFINER want leest auth.users direct (zelfde patroon als claim_welcome_reward).
CREATE OR REPLACE FUNCTION public.find_canonical_account(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_canon text := public.normalize_email(p_email);
    v_user_id uuid;
BEGIN
    IF v_canon = '' OR v_canon IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE public.normalize_email(email) = v_canon
    ORDER BY created_at ASC
    LIMIT 1;
    RETURN v_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.find_canonical_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_canonical_account(text) TO service_role;
