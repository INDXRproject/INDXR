import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

function isAppHost(hostname: string): boolean {
  return hostname === 'app.indxr.ai' || hostname.startsWith('app.localhost')
}

function isMarketingHost(hostname: string): boolean {
  return (
    hostname === 'indxr.ai' ||
    hostname === 'www.indxr.ai' ||
    (hostname.startsWith('localhost') && !hostname.startsWith('app.localhost'))
  )
}

// Paths that belong to the app subdomain
const APP_PATHS = ['/dashboard', '/admin']

// Paths that belong to the marketing domain (auth flows stay on indxr.ai)
const MARKETING_AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/onboarding', '/auth', '/suspended']

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isAuthPath(pathname: string): boolean {
  return MARKETING_AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { nextUrl, headers } = request
  const hostname = headers.get('host')?.split(':')[0] ?? 'localhost'
  const pathname = nextUrl.pathname

  // Skip middleware internals
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    const { response } = await updateSession(request)
    return response
  }

  // ── LOCAL DEV (localhost:3000 without app. prefix) ─────────────────────────
  // Passthrough — no subdomain routing in local dev without app. prefix
  if (isMarketingHost(hostname) && !hostname.startsWith('app.')) {
    const { response, user } = await updateSession(request)

    // Protect dashboard/admin in local dev (same-host redirect, no cross-host)
    if (isAppPath(pathname) && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', `${nextUrl.origin}${pathname}${nextUrl.search}`)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // ── MARKETING HOST (indxr.ai / www.indxr.ai) ──────────────────────────────
  if (isMarketingHost(hostname)) {
    const { response } = await updateSession(request)

    // Redirect app paths to app subdomain
    if (isAppPath(pathname)) {
      const appTarget = new URL(pathname + nextUrl.search, APP_URL)
      return NextResponse.redirect(appTarget, 308)
    }

    return response
  }

  // ── APP HOST (app.indxr.ai / app.localhost) ────────────────────────────────
  if (isAppHost(hostname)) {
    const { response, user } = await updateSession(request)

    // Redirect auth paths to marketing domain
    if (isAuthPath(pathname)) {
      const marketingTarget = new URL(pathname + nextUrl.search, MARKETING_URL)
      return NextResponse.redirect(marketingTarget, 308)
    }

    // Root → dashboard
    if (pathname === '/') {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Anything that's not an app path on app-host → redirect to marketing
    if (!isAppPath(pathname)) {
      const marketingTarget = new URL(pathname + nextUrl.search, MARKETING_URL)
      return NextResponse.redirect(marketingTarget, 308)
    }

    // Protect app paths — redirect unauthenticated users to login on marketing domain
    if (isAppPath(pathname) && !user) {
      const appUrl = APP_URL
      const currentUrl = new URL(pathname + nextUrl.search, appUrl)
      const loginUrl = new URL('/login', MARKETING_URL)
      loginUrl.searchParams.set('next', currentUrl.toString())
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // Fallback — unknown host, just update session
  const { response } = await updateSession(request)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
