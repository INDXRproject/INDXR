import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = isProd ? '.indxr.ai' : undefined

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({
                ...options,
                name,
                value,
                domain: cookieDomain,
                path: options?.path ?? '/',
              })
            )
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        },
      },
    }
  )
}
