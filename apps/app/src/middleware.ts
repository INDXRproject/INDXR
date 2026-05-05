import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@indxr/shared/utils/supabase/middleware'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3001'

// Paths that require authentication
const APP_PATHS = ['/dashboard', '/admin']

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  const pathname = nextUrl.pathname

  const { response, user } = await updateSession(request)

  // Root → dashboard
  if (pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Protect app paths — redirect unauthenticated users to login on marketing domain
  if (isAppPath(pathname) && !user) {
    const currentUrl = new URL(pathname + nextUrl.search, APP_URL)
    const loginUrl = new URL('/login', MARKETING_URL)
    loginUrl.searchParams.set('next', currentUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
