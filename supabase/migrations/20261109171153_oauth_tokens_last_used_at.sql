-- Gevonden 9-11 B6: Connected apps settings screen needs "last used" per client, which the
-- existing columns don't track (oauth_clients.last_token_at is last ISSUANCE across all users,
-- not last USE by this one). Stamped by OpaqueTokenVerifier.verify_token (mcp_server.py) on every
-- authenticated MCP request.
ALTER TABLE public.oauth_tokens ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
COMMENT ON COLUMN public.oauth_tokens.last_used_at IS
    'Stamped on every successful verify_token() call (mcp_server.py) — drives "last used" in the Connected apps settings screen (ADR-108 B6). Null until first use.';
