import { NextResponse } from "next/server";

// RFC 9728 Protected Resource Metadata for the MCP connector (ADR-108). Static — not proxied to
// the Python backend, so this answers even if Railway is down. Public, unauthenticated, CORS-open:
// any MCP client must be able to fetch it before it has a token.
export const runtime = "nodejs";

const BODY = {
  resource: "https://app.indxr.ai/api/mcp",
  authorization_servers: ["https://uivlvwcplcaixkzuiwsv.supabase.co/auth/v1"],
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
