import { NextRequest, NextResponse } from "next/server";

// GET /api/oauth/authorize — the standard OAuth authorization endpoint, called by the MCP client's
// browser. Creates a pending authorization at the Python backend (service-role write) and redirects
// the browser to the actual consent UI (/oauth/consent). On validation failure (unknown client,
// unregistered redirect_uri) this does NOT redirect to the caller-supplied redirect_uri — that URI
// isn't trusted yet at this point — it returns the error directly instead (ADR-108).
export const runtime = "nodejs";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://app.localhost:3001";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/authorize/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
    },
    body: JSON.stringify({
      client_id: sp.get("client_id"),
      redirect_uri: sp.get("redirect_uri"),
      code_challenge: sp.get("code_challenge"),
      code_challenge_method: sp.get("code_challenge_method"),
      resource: sp.get("resource"),
      scope: sp.get("scope"),
      state: sp.get("state"),
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.authorization_id) {
    return NextResponse.json(data || { error: "server_error" }, { status: res.status || 500 });
  }

  const consentUrl = new URL("/oauth/consent", APP_URL);
  consentUrl.searchParams.set("authorization_id", data.authorization_id);
  return NextResponse.redirect(consentUrl.toString());
}
