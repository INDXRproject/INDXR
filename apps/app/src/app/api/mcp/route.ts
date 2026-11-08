import { NextRequest } from "next/server";

// Transparent streaming proxy to the Python MCP server on Railway (ADR-108). Not a next.config.ts
// rewrite — a rewrite cannot inject the backend secret header. Not auth-gated here: this endpoint
// exists FOR OAuth bearer tokens (never the app's session cookie); the Python side verifies the
// token itself against Supabase's JWKS. The backend route carries a trailing slash
// (`${PYTHON_BACKEND_URL}/mcp/`) — without it, Starlette 307-redirects `/mcp` → `/mcp/`, which a
// strict MCP client will not follow for a POST.
export const runtime = "nodejs";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";
const BACKEND_URL = `${PYTHON_BACKEND_URL}/mcp/`;

// Headers meaningful to the MCP Streamable HTTP transport, forwarded request → backend.
const REQUEST_HEADERS = ["authorization", "content-type", "accept", "mcp-protocol-version", "mcp-session-id"];
// Headers meaningful to the client, forwarded backend → response (incl. on 401/405).
const RESPONSE_HEADERS = ["content-type", "www-authenticate", "mcp-session-id", "mcp-protocol-version"];

async function proxy(req: NextRequest, method: "GET" | "POST" | "DELETE"): Promise<Response> {
  const headers = new Headers();
  for (const h of REQUEST_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("X-Backend-Secret", process.env.BACKEND_API_SECRET || "");

  const backendRes = await fetch(BACKEND_URL, {
    method,
    headers,
    body: method === "GET" || method === "DELETE" ? undefined : req.body,
    // @ts-expect-error -- Node's fetch requires this when streaming a request body.
    duplex: method === "POST" ? "half" : undefined,
    signal: req.signal,
  });

  const outHeaders = new Headers();
  for (const h of RESPONSE_HEADERS) {
    const v = backendRes.headers.get(h);
    if (v) outHeaders.set(h, v);
  }

  // Stream the body through unbuffered — a JSON response is one chunk, an SSE response is many
  // over time; both work identically via passthrough.
  return new Response(backendRes.body, { status: backendRes.status, headers: outHeaders });
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}

export async function DELETE(req: NextRequest) {
  return proxy(req, "DELETE");
}
