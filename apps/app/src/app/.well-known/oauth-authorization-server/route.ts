import { NextResponse } from "next/server";

// RFC 8414 Authorization Server Metadata for our own OAuth 2.1 server (ADR-108) — the Python
// backend (backend/oauth_server.py) implements the actual endpoints; Next.js only fronts them.
// Static — not proxied, so this answers even if Railway is briefly down.
export const runtime = "nodejs";

const BODY = {
  issuer: "https://app.indxr.ai",
  authorization_endpoint: "https://app.indxr.ai/api/oauth/authorize",
  token_endpoint: "https://app.indxr.ai/api/oauth/token",
  registration_endpoint: "https://app.indxr.ai/api/oauth/register",
  revocation_endpoint: "https://app.indxr.ai/api/oauth/revoke",
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["mcp"],
  // RFC 9207 — the redirect always carries iss=, so clients (ChatGPT in particular) can use their
  // safer fixed-callback verification instead of trusting state alone.
  authorization_response_iss_parameter_supported: true,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET() {
  return NextResponse.json(BODY, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
