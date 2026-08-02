// Google Ads conversion events. These push to the gtag dataLayer, which only
// TRANSMITS once gtag.js has loaded — and gtag.js only loads after consent (Basic
// mode). So pushing here before consent is safe: the event queues and is dropped if
// consent is never granted. Missing env vars → no-op (tag never loads anyway).

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const PURCHASE_LABEL = process.env.NEXT_PUBLIC_GADS_LABEL_PURCHASE
const SIGNUP_LABEL = process.env.NEXT_PUBLIC_GADS_LABEL_SIGNUP

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

/**
 * Purchase conversion. `valueEur` is the BRUTO (VAT-inclusive) EUR list price from
 * pricing.ts — deliberately not revenue_ex_vat and not Adaptive-Pricing-adjusted (see
 * ADR-087). `transactionId` = Stripe session id → Google dedupes on it, so a page
 * refresh cannot double-count (a localStorage guard at the call site is the belt).
 */
export function trackPurchase({
  valueEur,
  transactionId,
}: {
  valueEur: number | null
  transactionId: string
}): void {
  if (!isBrowser() || !ADS_ID || !PURCHASE_LABEL || !window.gtag) return
  window.gtag("event", "conversion", {
    send_to: `${ADS_ID}/${PURCHASE_LABEL}`,
    ...(valueEur != null ? { value: valueEur, currency: "EUR" } : {}),
    transaction_id: transactionId,
  })
}

/**
 * Signup-completed conversion (no value). Because the caller navigates away right
 * after (window.location.href), we redirect via `event_callback` with a timeout
 * fallback so the redirect never gets cut off if the tag isn't loaded/consented.
 */
export function trackSignup(onDone?: () => void): void {
  if (!isBrowser() || !ADS_ID || !SIGNUP_LABEL || !window.gtag) {
    onDone?.()
    return
  }
  let called = false
  const done = () => {
    if (called) return
    called = true
    onDone?.()
  }
  window.gtag("event", "conversion", {
    send_to: `${ADS_ID}/${SIGNUP_LABEL}`,
    event_callback: done,
  })
  setTimeout(done, 1200)
}
