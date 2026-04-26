import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  const res = await fetch(`${PYTHON_BACKEND_URL}/sentry-test`);
  const data = await res.json().catch(() => ({ status: res.status }));
  return NextResponse.json(data, { status: res.status });
}
