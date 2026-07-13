-- FIX (financieel-kritiek): Supabase kent nieuwe public-functies automatisch EXECUTE toe aan
-- anon + authenticated (expliciete grants, niet via PUBLIC). Daardoor was admin_geld_summary()
-- — die het volledige money-model incl. interne test-data teruggeeft — aanroepbaar door élke
-- anon/authenticated user via /rest/v1/rpc/admin_geld_summary. REVOKE FROM PUBLIC ving dit niet.
-- Zelfde patroon als 20260711170300_lock_credit_rpcs / 20260712204359_get_user_credits_own_only.
REVOKE EXECUTE ON FUNCTION public.admin_geld_summary() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._geld_scope(boolean)  FROM anon, authenticated;
-- service_role behoudt EXECUTE (admin draait server-side via createAdminClient).
