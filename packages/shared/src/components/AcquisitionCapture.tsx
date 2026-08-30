'use client'

import { useEffect } from 'react'
import { useConsent } from '../providers/ConsentProvider'

// First-touch acquisition capture, GATED ON CONSENT (ePrivacy art. 5(3): storing non-essential info on
// the device needs prior consent — first-party or not, personal data or not; legitimate interest is not
// a valid basis for this category). Marketing attribution (utm, referrer, ad click id) is not strictly
// necessary, so the whole indxr_acq cookie waits for consent.
//
// The problem: the values are in the landing URL at arrival, but the banner appears after and the visitor
// may click on before deciding. Solution: capture the values into MODULE-LEVEL MEMORY (a JS variable, not
// device storage — runtime memory is not "storage in the terminal equipment" under 5(3)). That memory
// survives Next.js client-side navigation because the module is not re-evaluated on route changes, so a
// visitor who lands with ?gclid, clicks to another page, and only then accepts still gets attributed. A
// hard reload / cross-origin nav before consent loses it — acceptable: without device storage there is no
// compliant way to hold it across a full reload, and the values only matter if the visitor consents.
//
// When ad storage becomes allowed (EEA: explicit grant; ROW: implied unless declined) we write the cookie
// from memory. Declined or undecided → no cookie, so no acquisition data reaches the profile at signup —
// the intended outcome. First-touch preserved: a later visit never overwrites an existing cookie.
//
// Exception: the consent cookie itself (indxr_consent) stays unconditional — it is strictly necessary to
// remember the choice, holds only the choice, and cannot track. See consent.ts.

const COOKIE = 'indxr_acq'

// Held in memory (not on the device) until consent. Module-level so it survives client-side navigation.
let pendingAcq: string | null = null
let captured = false

export function AcquisitionCapture() {
  const { adStorageGranted } = useConsent()

  // Read the URL once, into memory only. First-touch: skip entirely if a cookie already exists.
  useEffect(() => {
    if (captured) return
    captured = true
    try {
      if (document.cookie.split('; ').some((c) => c.startsWith(COOKIE + '='))) return

      const params = new URLSearchParams(window.location.search)
      const utm_source = params.get('utm_source') || undefined
      const utm_medium = params.get('utm_medium') || undefined
      const utm_campaign = params.get('utm_campaign') || undefined
      const referrer = document.referrer || undefined
      const landing_path = window.location.pathname || undefined

      // Google Ads click identifiers (gclid, or gbraid/wbraid on iOS) + the arrival moment.
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
      pendingAcq = encodeURIComponent(JSON.stringify(data))
    } catch {
      /* best-effort — a layout-level capture must never throw */
    }
  }, [])

  // Write the cookie only once ad storage is allowed. Re-runs when consent changes (grant flips it true).
  useEffect(() => {
    if (!pendingAcq || !adStorageGranted) return
    try {
      if (document.cookie.split('; ').some((c) => c.startsWith(COOKIE + '='))) {
        pendingAcq = null
        return
      }
      const maxAge = 60 * 60 * 24 * 180 // 180 days
      const domain = window.location.hostname.endsWith('indxr.ai') ? '; domain=.indxr.ai' : ''
      document.cookie = `${COOKIE}=${pendingAcq}; path=/; max-age=${maxAge}; SameSite=Lax${domain}`
      pendingAcq = null
    } catch {
      /* best-effort */
    }
  }, [adStorageGranted])

  return null
}
