import { redirect } from "next/navigation";
import { createClient } from "@indxr/shared/utils/supabase/server";
import { Notice } from "@indxr/shared/components/ui/notice";
import { ConsentCard } from "./ConsentCard";

// OAuth consent screen for the MCP connector (ADR-108). Only Claude/ChatGPT and loopback (local
// MCP dev clients) may ever receive a redirect back from here — every other host is refused
// automatically, with no Approve button rendered at all, so a malicious or unregistered client
// cannot get a user to click through.
const ALLOWED_REDIRECT_HOSTS = [/^claude\.ai$/, /^claude\.com$/, /^chatgpt\.com$/, /^localhost$/, /^127\.0\.0\.1$/];

function isAllowedRedirectHost(uri: string): boolean {
  try {
    const host = new URL(uri).hostname;
    return ALLOWED_REDIRECT_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>;
}) {
  const { authorization_id: authorizationId, error: actionError } = await searchParams;

  if (!authorizationId) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Notice tone="error" title="Missing authorization request">
          This page needs an authorization_id — it is not meant to be opened directly.
        </Notice>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !data) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Notice tone="error" title="Could not load this authorization request">
          {error?.message || "Unknown error."}
        </Notice>
      </div>
    );
  }

  // Already consented (or just decided) — Supabase hands back a ready redirect_url directly.
  if ("redirect_url" in data) {
    redirect(data.redirect_url);
  }

  const { client, redirect_uri: redirectUri } = data;

  if (!isAllowedRedirectHost(redirectUri)) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Notice tone="error" title="This app was automatically declined">
          {client.name} is not a recognized app (Claude, ChatGPT, or a local MCP client) — INDXR.AI
          only allows connecting those. No access was granted.
        </Notice>
      </div>
    );
  }

  const redirectHost = new URL(redirectUri).hostname;

  return (
    <div className="px-4">
      {actionError && (
        <div className="mx-auto mt-6 max-w-md">
          <Notice tone="error" title="That didn't go through">
            Please try again.
          </Notice>
        </div>
      )}
      <ConsentCard authorizationId={authorizationId} clientName={client.name} redirectHost={redirectHost} />
    </div>
  );
}
