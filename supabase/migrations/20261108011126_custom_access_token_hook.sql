-- Custom Access Token Hook for the MCP/AI-connector OAuth flow (ADR-108).
-- Supabase's OAuth server issues ordinary `authenticated`-role user JWTs by default, which would let
-- a connected AI call the Data API directly (deduct_credits_atomic, write transcripts, etc). This
-- hook detects OAuth-issued tokens (client_id claim present, or authentication_method indicates the
-- OAuth authorization_code grant) and rebinds `aud` to the MCP resource URL per RFC 8707, so a token
-- minted for the MCP server is useless against anything else. Ordinary sessions (no client_id) pass
-- through with claims completely unchanged.
--
-- Inactive until the Custom Access Token Hook is enabled in Supabase Dashboard → Authentication →
-- Hooks, pointing at pg-functions://postgres/public/custom_access_token_hook. Creating this function
-- has zero effect on logins until that toggle is flipped.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claims jsonb;
  is_oauth boolean;
begin
  claims := coalesce(event->'claims', '{}'::jsonb);
  is_oauth := (claims->>'client_id' is not null)
    or (event->>'authentication_method' = 'oauth_provider/authorization_code');

  if is_oauth then
    claims := jsonb_set(claims, '{aud}', to_jsonb('https://app.indxr.ai/api/mcp'::text), true);
    -- Best-effort: Supabase may ignore or reject a role override here (undocumented) — verified
    -- empirically in the phase-1 gate, not assumed. aud-binding above is the primary defense either way.
    claims := jsonb_set(claims, '{role}', to_jsonb('anon'::text), true);
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
