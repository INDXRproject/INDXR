import { NextRequest, NextResponse } from "next/server";

// Thin proxy to the Python backend's DCR endpoint (ADR-108) — the backend owns all OAuth-table
// writes (service-role). No session/auth here: client registration is, by design, open to any
// MCP client (the backend itself rejects disallowed redirect-uri hosts).
export const runtime = "nodejs";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/register`, {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
    },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
