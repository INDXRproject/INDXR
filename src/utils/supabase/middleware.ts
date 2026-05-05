import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = isProd ? '.indxr.ai' : undefined

// Clears all sb-* auth cookies from both the response and the incoming request,
// so that neither the browser nor downstream middleware code sees stale tokens.
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(({ name }) => {
    if (!name.startsWith('sb-')) return
    response.cookies.set({
      name,
      value: '',
      domain: cookieDomain,
      path: '/',
      maxAge: 0,
    })
    request.cookies.delete(name)
  })
}

// Refreshes the Supabase session cookie and returns the updated response + user.
// Auth routing is handled by src/middleware.ts, not here.
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
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

  let user: User | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Stale cookie, revoked token, or JWT secret rotation — clear to stop retry loop.
      console.error('[auth-recovery] getUser error, clearing stale cookies:', error.message)
      clearAuthCookies(request, response)
    } else {
      user = data.user
    }
  } catch (err) {
    console.error('[auth-recovery] getUser exception, clearing stale cookies:', err)
    clearAuthCookies(request, response)
  }

  return { response, user }
}
