// Google Ads Consent Mode v2 — BASIC mode. Nothing loads to Google before consent.
//
// Storage is two-layered (decision: Khidr): localStorage is primary; a first-party
// cookie `indxr_consent` on `.indxr.ai` is the SYNC layer between indxr.ai and
// app.indxr.ai (where the purchase conversion fires). The cookie carries ONLY the
// choice — per-signal granted/denied + a consent-schema version + a timestamp. No
// identifier, no random id: nothing that can link two visits (else it would not be
// strictly necessary). On read, if both sources disagree, the most recent (timestamp)
// wins and is written back to both.
//
// This module is server-safe for `regionFromCountry`; all other functions touch
// document/window and must only be called client-side.

export type ConsentSignal = "granted" | "denied"

export interface ConsentState {
  ad_storage: ConsentSignal
  analytics_storage: ConsentSignal
  ad_user_data: ConsentSignal
  ad_personalization: ConsentSignal
}

export interface ConsentChoice extends ConsentState {
  version: string // consent-SCHEMA version (not the legal version) — bump only if the categories change
  ts: number // epoch ms, for cross-source conflict resolution
}

// Consent-schema version. Independent of LEGAL_VERSION: bump only when the consent
// categories themselves change (which would warrant re-prompting), not on every legal edit.
export const CONSENT_VERSION = "1"
export const CONSENT_STORAGE_KEY = "indxr_consent"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days ≈ 6 months

export const DENIED: ConsentState = {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
}
export const GRANTED: ConsentState = {
  ad_storage: "granted",
  analytics_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
}

// EU-27 + UK + Switzerland + EEA-EFTA (IS/LI/NO) → prior opt-in consent required.
const CONSENT_REQUIRED_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "GB", "CH", "IS", "LI", "NO",
])

/** Server-safe. Unknown/absent country → 'eea' (safe default: treat as consent-required). */
export function regionFromCountry(country: string | null | undefined): "eea" | "row" {
  if (!country) return "eea"
  return CONSENT_REQUIRED_COUNTRIES.has(country.toUpperCase()) ? "eea" : "row"
}

// ── client-only below ───────────────────────────────────────────────────────
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

function cookieDomainSuffix(): string {
  // Widen to the registrable domain in prod so the choice is shared across
  // indxr.ai ↔ app.indxr.ai (same pattern as AcquisitionCapture).
  return isBrowser() && window.location.hostname.endsWith("indxr.ai") ? "; domain=.indxr.ai" : ""
}

function isValidChoice(v: unknown): v is ConsentChoice {
  if (!v || typeof v !== "object") return false
  const c = v as Record<string, unknown>
  return (
    (c.ad_storage === "granted" || c.ad_storage === "denied") &&
    (c.analytics_storage === "granted" || c.analytics_storage === "denied") &&
    (c.ad_user_data === "granted" || c.ad_user_data === "denied") &&
    (c.ad_personalization === "granted" || c.ad_personalization === "denied") &&
    typeof c.ts === "number" && typeof c.version === "string"
  )
}

function parseChoice(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!isValidChoice(parsed)) return null
    if (parsed.version !== CONSENT_VERSION) return null // schema changed → re-prompt
    return parsed
  } catch {
    return null
  }
}

function readLocal(): ConsentChoice | null {
  if (!isBrowser()) return null
  return parseChoice(window.localStorage.getItem(CONSENT_STORAGE_KEY))
}

function readCookie(): ConsentChoice | null {
  if (!isBrowser()) return null
  const match = document.cookie.split("; ").find((c) => c.startsWith(CONSENT_STORAGE_KEY + "="))
  if (!match) return null
  return parseChoice(decodeURIComponent(match.slice(CONSENT_STORAGE_KEY.length + 1)))
}

export function makeChoice(state: ConsentState): ConsentChoice {
  return { ...state, version: CONSENT_VERSION, ts: Date.now() }
}

/** Read the stored EXPLICIT choice; reconcile localStorage vs cookie (newest wins) and re-sync both. */
export function readStoredChoice(): ConsentChoice | null {
  if (!isBrowser()) return null
  const local = readLocal()
  const cookie = readCookie()
  if (local && cookie) {
    const winner = cookie.ts >= local.ts ? cookie : local
    writeStoredChoice(winner)
    return winner
  }
  const one = local ?? cookie
  if (one) writeStoredChoice(one) // sync the missing layer
  return one
}

export function writeStoredChoice(choice: ConsentChoice): void {
  if (!isBrowser()) return
  const json = JSON.stringify(choice)
  window.localStorage.setItem(CONSENT_STORAGE_KEY, json)
  document.cookie =
    `${CONSENT_STORAGE_KEY}=${encodeURIComponent(json)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure${cookieDomainSuffix()}`
}

/** Actively delete any Google Ads cookies (`_gcl_*`) on both the host and `.indxr.ai`. */
export function clearGoogleAdsCookies(): void {
  if (!isBrowser()) return
  const domains = ["", cookieDomainSuffix(), `; domain=${window.location.hostname}`]
  for (const raw of document.cookie.split("; ")) {
    const name = raw.split("=")[0]
    if (name.startsWith("_gcl")) {
      for (const d of domains) {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${d}`
      }
    }
  }
}

// ── gtag / dataLayer bootstrap ──────────────────────────────────────────────
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Install the canonical gtag stub (pushes real `arguments` to dataLayer). Idempotent. */
export function ensureGtag(): void {
  if (!isBrowser()) return
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
  }
}

export function pushConsentDefault(state: ConsentState): void {
  ensureGtag()
  window.gtag!("consent", "default", { ...state })
}

export function pushConsentUpdate(state: ConsentState): void {
  ensureGtag()
  window.gtag!("consent", "update", { ...state })
}

let tagRequested = false
/** Inject gtag.js (only after consent / for ROW default-granted). Idempotent; no-op without an Ads id. */
export function loadGoogleTag(adsId: string | undefined): void {
  if (!isBrowser() || !adsId || tagRequested) return
  tagRequested = true
  ensureGtag()
  const s = document.createElement("script")
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`
  document.head.appendChild(s)
  window.gtag!("js", new Date())
  // cookie_domain:'auto' → _gcl_au on `.indxr.ai`, readable on app.indxr.ai.
  window.gtag!("config", adsId, { cookie_domain: "auto" })
}
