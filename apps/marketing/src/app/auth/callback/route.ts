import { createClient } from '@indxr/shared/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDisposableEmail } from '@indxr/shared/utils/disposable-email'
import { safeAppRedirect } from '@indxr/shared/lib/safe-redirect'
import { PH_DID_PARAM, isValidDistinctId } from '@indxr/shared/lib/posthog-identity'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Carry the anonymous PostHog distinct_id through to the first identified page so the client can
  // alias the pre-signup identity into the user (lib/posthog-identity). Validated; forwarded onto the
  // login/signup destinations only (never the recovery route). Stripped on the client after use.
  const rawPhDid = requestUrl.searchParams.get(PH_DID_PARAM)
  const phDid = isValidDistinctId(rawPhDid) ? rawPhDid : null
  const withPhDid = (url: string): string => {
    if (!phDid) return url
    const u = new URL(url)
    u.searchParams.set(PH_DID_PARAM, phDid)
    return u.toString()
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password recovery: the exchange above established a (recovery) session so the user can set a new
      // password. Route to the set-new-password page and SKIP the onboarding gate + acquisition/disposable
      // logic below — this is a recovery, not a login/signup.
      if (requestUrl.searchParams.get('recovery') === '1') {
        return NextResponse.redirect(`${MARKETING_URL}/reset-password`)
      }

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
              // Google Ads click identifiers (ADR-101) — OAuth signups don't carry the cookie into
              // user_metadata, so fill them here too, first-touch-guarded like the rest.
              gclid: 'gclid',
              gbraid: 'gbraid',
              wbraid: 'wbraid',
              click_id_at: 'click_id_at',
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

      // Valideer het checkout-doel één keer (open-redirect-guard).
      const safeNext = safeAppRedirect(requestUrl.searchParams.get('next'))

      if (!profile || !profile.onboarding_completed) {
        // Thread het doel dóór de onboarding-gate i.p.v. het te laten vallen.
        return NextResponse.redirect(withPhDid(
          safeNext ? `${MARKETING_URL}/onboarding?next=${encodeURIComponent(safeNext)}` : `${MARKETING_URL}/onboarding`
        ))
      }

      if (safeNext) {
        return NextResponse.redirect(withPhDid(safeNext))
      }

      return NextResponse.redirect(withPhDid(`${APP_URL}/dashboard`))
    }
  }

  // Fallback (e.g. no code)
  return NextResponse.redirect(`${APP_URL}/dashboard`)
}
