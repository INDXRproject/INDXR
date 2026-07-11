-- Blok A: dicht het RPC-privilege-lek. De credit-MUTERENDE SECURITY DEFINER-RPC's waren
-- EXECUTE-baar door anon+authenticated (via PUBLIC + expliciete grants) → een ingelogde user kon
-- zichzelf via een directe rpc()-call credits geven (add_credits/refund*). Lockdown op basis van de
-- geverifieerde caller-map (grep frontend+backend):
--
--   RPC                              legit non-service caller?         actie
--   add_credits                      webhook (was anon → nu service)   → service_role only
--   reserve/settle/refund/           geen (alleen Python-backend)      → service_role only
--     refund_flat/update_playlist_video_progress
--   deduct_credits_atomic            RAG-export server-action (auth;    → houd authenticated
--                                    eigen credits aftrekken = geen exploit)
--   claim_welcome_reward             server-action (auth; 1× per user) → houd authenticated
--   get_user_credits                 read-only (anon extract-flow)     → ACL ONGEMOEID (alleen search_path)
--   submit_support_ticket            al gelockt (geen anon/PUBLIC)     → ongemoeid
--
-- VOORWAARDE: de Stripe-webhook is omgezet naar de service_role-client VÓÓR deze migratie wordt
-- toegepast (anders breekt de credit-grant op elke betaling). Applied ná bevestigde webhook-deploy.

-- ── Lock to service_role only ────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, jsonb, text) TO service_role;
ALTER  FUNCTION public.add_credits(uuid, integer, text, jsonb, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, uuid, uuid, text) TO service_role;
ALTER  FUNCTION public.reserve_credits(uuid, integer, uuid, uuid, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.settle_credits(uuid, integer, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.settle_credits(uuid, integer, uuid, uuid, text, text) TO service_role;
ALTER  FUNCTION public.settle_credits(uuid, integer, uuid, uuid, text, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_credits(uuid, uuid) TO service_role;
ALTER  FUNCTION public.refund_credits(uuid, uuid) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.refund_credits_flat(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_credits_flat(uuid, uuid, integer, text) TO service_role;
ALTER  FUNCTION public.refund_credits_flat(uuid, uuid, integer, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.update_playlist_video_progress(uuid, text, text, uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_playlist_video_progress(uuid, text, text, uuid, text, integer, text) TO service_role;
ALTER  FUNCTION public.update_playlist_video_progress(uuid, text, text, uuid, text, integer, text) SET search_path = public, pg_temp;

-- ── Keep authenticated (legit self-service caller), drop anon/PUBLIC ──────────
-- deduct_credits_atomic: RAG-export server-action deducts the user's OWN credits (not exploitable).
REVOKE EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) TO authenticated, service_role;
ALTER  FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) SET search_path = public, pg_temp;

-- claim_welcome_reward: server-action, 1×-per-user (welcome_reward_claimed guard). search_path set in Blok E.
REVOKE EXECUTE ON FUNCTION public.claim_welcome_reward(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_welcome_reward(uuid) TO authenticated, service_role;

-- ── Read-only: keep ACL as-is, only pin search_path ──────────────────────────
ALTER FUNCTION public.get_user_credits(uuid) SET search_path = public, pg_temp;
