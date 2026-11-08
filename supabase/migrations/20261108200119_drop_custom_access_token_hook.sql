-- Cleanup for the abandoned Supabase-hosted OAuth approach (ADR-108, revised). The Custom Access
-- Token Hook toggle in Dashboard was already disabled (verified via Management API by the cloud
-- session, then independently re-verified here: a fresh e2e-1 session's token has unchanged
-- aud/role/no client_id, and the Supabase OAuth server's own endpoints now 404). Safe to remove the
-- function itself — the MCP connector now uses our own opaque-token OAuth 2.1 server instead
-- (see 20261108191428_oauth_server_tables.sql, backend/oauth_server.py).

DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);
