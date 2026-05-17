import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = isProd ? '.indxr.ai' : undefined

// Refreshes the Supabase session cookie and returns the updated response + user claims.
// Auth routing is handled by each app's middleware.ts, not here.
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: object | null }> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isProd,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
              path: options?.path ?? '/',
            })
          )
        },
      },
    }
  )

  // getClaims() reads JWT claims locally — no network call when no session exists,
  // no refresh-token retry loop, safe to call on auth callback routes.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ?? null

  return { response, user }
}
