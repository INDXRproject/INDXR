import { NextResponse } from "next/server";

// Supabase's OAuth server redirects to `site_url` (indxr.ai) + the configured authorization_path
// (/oauth/consent) — this app only forwards the querystring to the real consent screen on
// app.indxr.ai (which is where auth/session cookies live). Not logged in → the app's own
// middleware bounces to marketing /login with next= pointing back here, same as every other
// app-gated page.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://app.localhost:3001";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = new URL("/oauth/consent", APP_URL);
  target.search = requestUrl.search;
  return NextResponse.redirect(target.toString());
}
