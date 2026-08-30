'use client'

import { useEffect } from 'react'

// First-touch acquisition capture. On the first marketing landing (no cookie yet) this records
// utm_source/medium/campaign + referrer + landing path into a long-lived cookie. The signup server
// action reads this cookie and threads it into signUp options.data → raw_user_meta_data → profiles
// (via the on_auth_user_created_acquisition trigger). First-touch: never overwritten on later pages.
//
// ADR-036 keeps auth on the marketing host, so a cookie set here on indxr.ai is same-host at signup.
// The domain is widened to .indxr.ai in production so the value also survives a marketing→app hop.

const COOKIE = 'indxr_acq'

export function AcquisitionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split('; ').some((c) => c.startsWith(COOKIE + '='))) return

      const params = new URLSearchParams(window.location.search)
      const utm_source = params.get('utm_source') || undefined
      const utm_medium = params.get('utm_medium') || undefined
      const utm_campaign = params.get('utm_campaign') || undefined
      const referrer = document.referrer || undefined
      const landing_path = window.location.pathname || undefined

      // Google Ads click identifiers (gclid, or gbraid/wbraid on iOS). Captured first-touch like the
      // rest and only ever persisted to a profile at signup (never for anonymous visitors, never passed
      // in the URL between pages). Kept now so a later server-side conversion upload stays possible;
      // click_id_at records the arrival moment — without it a click id is useless later. (ADR-101.)
      const gclid = params.get('gclid') || undefined
      const gbraid = params.get('gbraid') || undefined
      const wbraid = params.get('wbraid') || undefined
      const click_id_at = (gclid || gbraid || wbraid) ? new Date().toISOString() : undefined

      // signup_source: utm_source wins; else the referrer host; else 'direct'.
      let signup_source = utm_source
      if (!signup_source && referrer) {
        try {
          signup_source = new URL(referrer).hostname
        } catch {
          /* malformed referrer — ignore */
        }
      }
      signup_source = signup_source || 'direct'

      const data = { signup_source, utm_source, utm_medium, utm_campaign, referrer, landing_path,
        gclid, gbraid, wbraid, click_id_at }
      const value = encodeURIComponent(JSON.stringify(data))
      const maxAge = 60 * 60 * 24 * 180 // 180 days
      const domain = window.location.hostname.endsWith('indxr.ai') ? '; domain=.indxr.ai' : ''
      document.cookie = `${COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${domain}`
    } catch {
      /* best-effort — a layout-level capture must never throw */
    }
  }, [])

  return null
}
