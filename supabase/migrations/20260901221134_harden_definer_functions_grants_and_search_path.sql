-- Supabase security advisor leegwerken (2026-09-02): SECURITY DEFINER EXECUTE-grants + search_path.
-- Onderbouwing per functie geverifieerd tegen callsites (createAdminClient=service_role, backend=service_role,
-- authenticated session-client) en tegen de bestaande locked-pattern ACL's (admin_finance_summary / get_user_credits).
-- Toegepast via Supabase MCP op 2026-09-02 (version 20260901221134); dit bestand houdt de repo in sync.

-- ============ 1. DODE CODE — DROP (geen callers; CLAUDE.md-orphans) ============
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer, text, jsonb);
DROP FUNCTION IF EXISTS public.reset_monthly_quota(uuid);

-- ============ 2. LOCKDOWN → service_role only (waren anon+authenticated-uitvoerbaar via /rest/v1/rpc) ============
REVOKE EXECUTE ON FUNCTION public.admin_operations_v3(timestamptz, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_operations_v3(timestamptz, timestamptz, boolean) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_summary_cost_panel(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_summary_cost_panel(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_summary_cost_per_user(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_summary_cost_per_user(integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.bump_caption_proxy_bytes(bigint) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.bump_caption_proxy_bytes(bigint) TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_summary_cost_baseline(integer, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_summary_cost_baseline(integer, integer, numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.watchdog_unrefunded_reserved(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.watchdog_unrefunded_reserved(integer) TO service_role;
-- Credit-muterende RPC (ADR-054 = service_role only; drift herstelde PUBLIC-grant → authenticated kon 'm draaien, bewezen).
REVOKE EXECUTE ON FUNCTION public.settle_credits(uuid, integer, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.settle_credits(uuid, integer, uuid, uuid, text, text, text) TO service_role;

-- ============ 3. TRIGGER-functies — geen client-EXECUTE nodig (vuren als table-owner) ============
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_acquisition() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user_acquisition() TO service_role;
REVOKE EXECUTE ON FUNCTION public.transcripts_library_bytes_trigger() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.transcripts_library_bytes_trigger() TO service_role;

-- ============ 4. USER-FACING → houd authenticated, verwijder anon+PUBLIC (model get_user_credits) ============
REVOKE EXECUTE ON FUNCTION public.submit_support_ticket(text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.submit_support_ticket(text, text, text, uuid, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.library_storage_is_full(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.library_storage_is_full(uuid) TO authenticated, service_role;

-- ============ 5. search_path pinnen (function_search_path_mutable) — ALTER only, body ongewijzigd ============
-- Geen van deze gebruikt extensie-schema-functies (geverifieerd: alleen public + pg_catalog) → public, pg_temp volstaat.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.watchdog_unrefunded_reserved(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.refund_credits(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_playlist_video_progress(uuid, text, text, uuid, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_email(text) SET search_path = public, pg_temp;
