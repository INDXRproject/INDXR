import { createBrowserClient } from '@supabase/ssr'

const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = isProd ? '.indxr.ai' : undefined

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isProd,
      },
    }
  )
}
