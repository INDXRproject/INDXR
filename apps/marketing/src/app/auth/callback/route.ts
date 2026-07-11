import { createClient } from '@indxr/shared/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDisposableEmail } from '@indxr/shared/utils/disposable-email'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Security Check: Disposable Email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const isDisposable = await isDisposableEmail(user.email)
        if (isDisposable) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${MARKETING_URL}/login?error=Disposable emails are not allowed via OAuth`)
        }
      }

      // First-touch acquisition for OAuth signups. signInWithOAuth does not carry the
      // acquisition cookie into user_metadata, so the acquisition trigger leaves these NULL.
      // Fill them here, guarded by .is('signup_source', null) → first-touch only, never
      // overwrites, and a no-op for returning users. Best-effort: never blocks the callback.
      if (user?.id) {
        try {
          const raw = (await cookies()).get('indxr_acq')?.value
          if (raw) {
            const acq = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
            const colMap: Record<string, string> = {
              signup_source: 'signup_source',
              utm_source: 'utm_source',
              utm_medium: 'utm_medium',
              utm_campaign: 'utm_campaign',
              referrer: 'signup_referrer',
              landing_path: 'signup_landing_path',
            }
            const patch: Record<string, string> = {}
            for (const [key, col] of Object.entries(colMap)) {
              const v = acq[key]
              if (typeof v === 'string' && v) patch[col] = v
            }
            if (Object.keys(patch).length > 0) {
              await supabase.from('profiles').update(patch).eq('id', user.id).is('signup_source', null)
            }
          }
        } catch {
          /* best-effort — acquisition must never block the OAuth callback */
        }
      }

      // Check Onboarding Status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single()

      if (!profile || !profile.onboarding_completed) {
        return NextResponse.redirect(`${MARKETING_URL}/onboarding`)
      }

      const next = requestUrl.searchParams.get('next')
      if (next) {
        try {
          const nextUrl = new URL(next)
          if (nextUrl.host === new URL(APP_URL).host) {
            return NextResponse.redirect(nextUrl)
          }
        } catch {
          // invalid URL — fallthrough to default
        }
      }

      return NextResponse.redirect(`${APP_URL}/dashboard`)
    }
  }

  // Fallback (e.g. no code)
  return NextResponse.redirect(`${APP_URL}/dashboard`)
}
