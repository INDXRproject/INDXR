// Bridge the pre-signup anonymous PostHog identity across the OAuth / email-verification hard reload.
//
// posthog-js runs on persistence:'memory' (cookieless by design, ePrivacy 5(3)), so a NEW random
// distinct_id is generated after every hard page load. The redirect to accounts.google.com — and the
// click on an email-verification link — is exactly such a load. On return identify(userId) therefore
// merges only the *current* (post-reload) anonymous id and orphans the pre-signup one, so one real user
// shows up as several PostHog persons and every ad-click→activation funnel reads zero.
//
// Fix: carry the anonymous distinct_id in the URL (NOT device storage — ePrivacy 5(3) is about storage,
// not URL params) and, on return (where the user is ALWAYS identified, since the session is present),
// alias() it into the user. alias is persistence-agnostic, so it works identically under 'memory' and,
// after consent, 'localStorage+cookie' — the bootstrap "ignored when a stored id exists" pitfall never
// applies because we never bootstrap here. See ADR-103 / monitoring.md.

/** URL parameter that carries the pre-redirect anonymous PostHog distinct_id. Stripped after use. */
export const PH_DID_PARAM = "ph_did"

// PostHog anonymous distinct_ids are UUIDs (UUIDv7). Reject anything else so a copied link, a garbage
// value, or a foreign id can never alias two different people together.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidDistinctId(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v)
}

// Append the (validated) anonymous distinct_id to a post-login redirect target so AuthContext on the
// destination aliases the pre-login identity into the user. Email/password login has no OAuth callback —
// the server action redirects straight to the destination — so the id rides on that target instead of a
// callback URL. Works for relative ('/onboarding?next=…') and absolute ('https://app.indxr.ai/dashboard')
// targets. isValidDistinctId guarantees a bare UUID, so direct interpolation needs no further encoding;
// an invalid/absent id returns the target untouched (no merge).
export function appendPhDid(target: string, rawPhDid: unknown): string {
  if (!isValidDistinctId(rawPhDid)) return target
  return `${target}${target.includes("?") ? "&" : "?"}${PH_DID_PARAM}=${rawPhDid}`
}
