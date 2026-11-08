import { NextRequest, NextResponse } from "next/server";

// Thin proxy to the Python backend's token endpoint (ADR-108) — machine-to-machine, no session
// cookie involved. Form-encoded body passed through untouched (code/code_verifier/refresh_token
// never parsed or logged here).
export const runtime = "nodejs";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/x-www-form-urlencoded",
      "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
    },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}
