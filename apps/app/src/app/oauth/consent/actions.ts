"use server";

import { redirect } from "next/navigation";
import { createClient } from "@indxr/shared/utils/supabase/server";

// Approve/deny an MCP OAuth authorization request (ADR-108). Both end in a redirect back to the
// requesting client (success with a code, or an access_denied error) — there is no "stay on this
// page" outcome once a decision is made.

export async function approveOAuthAuthorization(authorizationId: string): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId, {
    skipBrowserRedirect: true,
  });
  if (error || !data?.redirect_url) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=approve_failed`);
  }
  redirect(data.redirect_url);
}

export async function denyOAuthAuthorization(authorizationId: string): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, {
    skipBrowserRedirect: true,
  });
  if (error || !data?.redirect_url) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=deny_failed`);
  }
  redirect(data.redirect_url);
}
