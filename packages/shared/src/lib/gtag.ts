// Google Ads conversion events. These push to the gtag dataLayer, which only
// TRANSMITS once gtag.js has loaded — and gtag.js only loads after consent (Basic
// mode). So pushing here before consent is safe: the event queues and is dropped if
// consent is never granted. Missing env vars → no-op (tag never loads anyway).

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const PURCHASE_LABEL = process.env.NEXT_PUBLIC_GADS_LABEL_PURCHASE
const SIGNUP_LABEL = process.env.NEXT_PUBLIC_GADS_LABEL_SIGNUP
const ACTIVATION_LABEL = process.env.NEXT_PUBLIC_GADS_LABEL_ACTIVATION

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
 * Activation conversion — fires when the frontend observes the account's FIRST completed premium
 * action (server truth: the job-status response's `first_premium_action` boolean, set once atomically
 * by mark_first_premium_action; ADR-101). Value €1 + currency so the bid strategy can weigh an
 * activation (€1) against a purchase (its real value). One-per-account by nature (the server flag is
 * true for exactly one job); the caller adds a localStorage guard against a reload re-fire, mirroring
 * trackPurchase. Same Consent Mode Basic behaviour as purchase/signup: pushing before consent queues
 * the event (dropped if consent never comes); missing label / no window.gtag → silent no-op, no throw.
 */
export function trackActivation(): void {
  if (!isBrowser() || !ADS_ID || !ACTIVATION_LABEL || !window.gtag) return
  window.gtag("event", "conversion", {
    send_to: `${ADS_ID}/${ACTIVATION_LABEL}`,
    value: 1,
    currency: "EUR",
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
