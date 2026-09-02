-- Bescherming tegen (accidentele) verwijdering van kritieke accounts. Aanleiding: incident 2026-09-02
-- (13 accounts verwijderd via een GoTrue-admin-lus). Deze guard werkt OOK tegen de service-role-sleutel:
-- een BEFORE DELETE-trigger op auth.users vuurt voor ÉLKE rol (service_role/supabase_auth_admin/postgres),
-- ongeacht BYPASSRLS (triggers zijn geen RLS). Bewezen dat BEFORE DELETE-triggers op auth.users vuren voor
-- het admin-delete-pad: de bestaande scrub_pii_before_user_delete-trigger draait bij self-service delete
-- (die admin.deleteUser gebruikt). Zie docs/wiki/operations/incident-2026-09-02-user-deletion.md + LESSONS.
-- Toegepast via Supabase MCP op 2026-09-02 (version 20260902010538); dit bestand houdt de repo in sync.
-- Bewijs: admin-API DELETE op het beschermde account contact@indxr.ai -> HTTP 500 P0001 "is protected",
-- account bleef bestaan. Niet-beschermde ids (bv. self-service delete van de eigen user) passeren ongehinderd.

CREATE TABLE IF NOT EXISTS public.protected_users (
  user_id    uuid PRIMARY KEY,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.protected_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.protected_users FROM anon, authenticated;
GRANT  ALL ON public.protected_users TO service_role;
COMMENT ON TABLE public.protected_users IS
  'User-ids die NOOIT uit auth.users verwijderd mogen worden — afgedwongen door de BEFORE DELETE-trigger prevent_protected_user_delete_trigger. SERVICE-ROLE-ONLY: RLS aan zonder policies + REVOKE anon/authenticated. Moet een beschermd account écht weg, verwijder HIER eerst de rij (bewuste twee-stappen-actie).';

INSERT INTO public.protected_users(user_id, reason)
VALUES ('aa469edc-1af6-4467-95b6-1b0e8b25ef4d', 'Admin-account contact@indxr.ai — nooit verwijderen (ADMIN_USER_ID)')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.prevent_protected_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.protected_users WHERE user_id = OLD.id) THEN
    RAISE EXCEPTION 'auth.users % is protected and cannot be deleted (see public.protected_users). Remove the protection row first if this deletion is truly intended.', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_protected_user_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.prevent_protected_user_delete() TO service_role;

DROP TRIGGER IF EXISTS prevent_protected_user_delete_trigger ON auth.users;
CREATE TRIGGER prevent_protected_user_delete_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_user_delete();
