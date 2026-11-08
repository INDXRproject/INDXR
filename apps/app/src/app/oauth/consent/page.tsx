import { Notice } from "@indxr/shared/components/ui/notice";
import { ConsentCard } from "./ConsentCard";

// OAuth consent screen for the MCP connector (ADR-108) — now backed by our own OAuth 2.1 server
// (backend/oauth_server.py), not Supabase's. Only Claude/ChatGPT and loopback (local MCP dev
// clients) may ever receive a redirect back from here; the backend already refuses any other host
// at DCR time, this is a second check. No "remembered consent": every authorize shows this screen.
const ALLOWED_REDIRECT_HOSTS = [/^claude\.ai$/, /^claude\.com$/, /^chatgpt\.com$/, /^localhost$/, /^127\.0\.0\.1$/];

function isAllowedRedirectHost(uri: string): boolean {
  try {
    const host = new URL(uri).hostname;
    return ALLOWED_REDIRECT_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

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

  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/authorize/${encodeURIComponent(authorizationId)}`, {
    headers: { "X-Backend-Secret": process.env.BACKEND_API_SECRET || "" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Notice tone="error" title="Could not load this authorization request">
          {data?.error_description || "Unknown error."}
        </Notice>
      </div>
    );
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
