-- Self-hosted OAuth 2.1 authorization server for the MCP connector (ADR-108, revised). Replaces the
-- abandoned approach of rewriting aud/role on Supabase-issued JWTs via a Custom Access Token Hook —
-- that approach failed the security gate because PostgREST/Storage/GoTrue do not enforce `aud` and
-- RLS policies on `transcripts` key off `auth.uid()` (the `sub` claim) regardless of `role`. Opaque
-- tokens (random strings, never a valid JWT) are structurally impossible for Supabase's own APIs to
-- accept, so the isolation guarantee no longer depends on configuration those services don't check.
--
-- SERVICE-ROLE-ONLY (CLAUDE.md convention): RLS enabled, zero policies, explicit REVOKE from
-- anon/authenticated. Only backend/oauth_server.py (service-role) ever touches these tables.

CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name   text NOT NULL,
  redirect_uris text[] NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_token_at timestamptz  -- null until first token issuance; drives the 30-day lazy-cleanup rule
);

CREATE TABLE IF NOT EXISTS public.oauth_authorizations (
  id               text PRIMARY KEY,  -- the authorization_id in the consent-screen URL
  client_id        uuid NOT NULL REFERENCES public.oauth_clients(id) ON DELETE CASCADE,
  redirect_uri     text NOT NULL,
  code_challenge   text NOT NULL,
  code_challenge_method text NOT NULL,
  scope            text,
  resource         text NOT NULL,
  state            text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'exchanged')),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- null until consent decision
  code_hash        text,  -- sha256 hex of the issued code, set on approve
  code_expires_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')  -- pending-authorization TTL
);

CREATE UNIQUE INDEX IF NOT EXISTS oauth_authorizations_code_hash_idx ON public.oauth_authorizations (code_hash) WHERE code_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS oauth_authorizations_expires_idx ON public.oauth_authorizations (expires_at);

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  token_hash  text PRIMARY KEY,  -- sha256 hex of the raw opaque token — the raw value is never stored
  token_type  text NOT NULL CHECK (token_type IN ('access', 'refresh')),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.oauth_clients(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL,  -- shared by an access+refresh pair and every rotation of it — enables reuse-detection revocation
  scope       text,
  resource    text NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_tokens_family_idx ON public.oauth_tokens (family_id);
CREATE INDEX IF NOT EXISTS oauth_tokens_user_idx ON public.oauth_tokens (user_id);
CREATE INDEX IF NOT EXISTS oauth_tokens_expires_idx ON public.oauth_tokens (expires_at);

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.oauth_clients FROM anon, authenticated;
REVOKE ALL ON public.oauth_authorizations FROM anon, authenticated;
REVOKE ALL ON public.oauth_tokens FROM anon, authenticated;

COMMENT ON TABLE public.oauth_clients IS 'DCR-registered MCP OAuth clients (public clients, PKCE-only, no secret). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants.';
COMMENT ON TABLE public.oauth_authorizations IS 'Pending/decided OAuth authorization requests + single-use codes (ADR-108). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants.';
COMMENT ON TABLE public.oauth_tokens IS 'Opaque access/refresh tokens, stored only as a SHA-256 hash (ADR-108). SERVICE-ROLE-ONLY: RLS aan zonder policies + geen anon/authenticated grants.';
