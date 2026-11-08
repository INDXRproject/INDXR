"use server";

import { redirect } from "next/navigation";
import { createClient } from "@indxr/shared/utils/supabase/server";

// Approve/deny an MCP OAuth authorization request (ADR-108) against our own OAuth 2.1 server
// (backend/oauth_server.py — no longer Supabase's). Both end in a redirect back to the requesting
// client (success with a code, or an access_denied error) — there is no "stay on this page" outcome
// once a decision is made.

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

async function decide(authorizationId: string, action: "approve" | "deny"): Promise<never> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=${action}_failed`);
  }

  const res = await fetch(
    `${PYTHON_BACKEND_URL}/oauth/authorize/${encodeURIComponent(authorizationId)}/consent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
        // The backend verifies this itself (supabase.auth.get_user) — never trusts a claimed user_id.
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.redirect_url) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=${action}_failed`);
  }
  redirect(data.redirect_url);
}

export async function approveOAuthAuthorization(authorizationId: string): Promise<never> {
  return decide(authorizationId, "approve");
}

export async function denyOAuthAuthorization(authorizationId: string): Promise<never> {
  return decide(authorizationId, "deny");
}
