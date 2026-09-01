"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  ConsentChoice,
  DENIED,
  GRANTED,
  clearAcquisitionCookie,
  clearGoogleAdsCookies,
  ensureGtag,
  loadGoogleTag,
  makeChoice,
  pushConsentDefault,
  pushConsentUpdate,
  readStoredChoice,
  writeStoredChoice,
} from "../lib/consent"
import { ConsentBanner } from "../components/consent/ConsentBanner"
import posthog from "posthog-js"

type Region = "eea" | "row"

interface ConsentContextValue {
  /** The stored explicit choice, or null if none has been made. */
  choice: ConsentChoice | null
  region: Region
  /** Whether non-essential ad/marketing storage is currently allowed. EEA: only after an explicit
   *  grant. ROW: implied-granted unless explicitly declined. Single source of truth for the acquisition
   *  cookie and any other consent-gated marketing storage. */
  adStorageGranted: boolean
  grantAll: () => void
  denyAll: () => void
  openManager: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider")
  return ctx
}

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

export function ConsentProvider({
  region,
  children,
}: {
  region: Region
  children: React.ReactNode
}) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null)
  const [ready, setReady] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)

  // One-time bootstrap: reconcile stored choice, set Consent Mode default, and — only
  // when appropriate — load the tag. BASIC mode: no gtag.js request before consent.
  useEffect(() => {
    ensureGtag()
    const stored = readStoredChoice()
    if (stored) {
      pushConsentDefault(stored)
      if (stored.ad_storage === "granted") {
        pushConsentUpdate(stored)
        loadGoogleTag(ADS_ID)
      }
      setChoice(stored)
    } else if (region === "row") {
      // Non-EEA: implied consent. Default granted + load tag, but do NOT persist an
      // implicit choice (so an EEA visit always re-evaluates and gets the banner).
      pushConsentDefault(GRANTED)
      loadGoogleTag(ADS_ID)
    } else {
      // EEA, no choice yet: default denied, banner will show. No request to Google.
      pushConsentDefault(DENIED)
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grantAll = useCallback(() => {
    const c = makeChoice(GRANTED)
    writeStoredChoice(c)
    pushConsentUpdate(GRANTED)
    loadGoogleTag(ADS_ID)
    // FIX B: upgrade PostHog to persistent storage so the distinct_id survives page loads and the
    // indxr.ai↔app.indxr.ai hop (cross-subdomain cookie on `.indxr.ai`). Known caveat (posthog-js
    // #3130): switching persistence mints a new session_id, so pre/post-consent activity counts as
    // separate sessions — documented in monitoring.md, no workaround built.
    posthog.set_config({ persistence: "localStorage+cookie", cross_subdomain_cookie: true })
    setChoice(c)
    setManagerOpen(false)
  }, [])

  const denyAll = useCallback(() => {
    const c = makeChoice(DENIED)
    writeStoredChoice(c)
    pushConsentUpdate(DENIED)
    clearGoogleAdsCookies() // a withdrawal that leaves cookies is not a withdrawal
    clearAcquisitionCookie() // ... and that includes the first-party attribution cookie
    // FIX B: back to cookieless — a withdrawal must stop the persistent device-id too.
    posthog.set_config({ persistence: "memory" })
    setChoice(c)
    setManagerOpen(false)
  }, [])

  const openManager = useCallback(() => setManagerOpen(true), [])

  // EEA: only an explicit grant permits ad storage. ROW: implied-granted unless explicitly declined.
  const adStorageGranted = region === "row" ? choice?.ad_storage !== "denied" : choice?.ad_storage === "granted"

  const value = useMemo<ConsentContextValue>(
    () => ({ choice, region, adStorageGranted, grantAll, denyAll, openManager }),
    [choice, region, adStorageGranted, grantAll, denyAll, openManager],
  )

  // Show the banner when the user opened the manager, or (EEA + no choice yet).
  const showBanner = ready && (managerOpen || (region === "eea" && choice === null))

  // Signal the banner's presence on <html> so pages that centre content in the viewport (the auth
  // shells) can reserve space for the fixed 213px banner. Without this the banner overlapped the
  // "Confirm password" field and covered "Create account" on mobile (LESSONS 2026-09-01).
  useEffect(() => {
    const el = document.documentElement
    if (showBanner) el.dataset.consentBanner = ""
    else delete el.dataset.consentBanner
    return () => { delete el.dataset.consentBanner }
  }, [showBanner])

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {showBanner && (
        <ConsentBanner
          hasChoice={choice !== null}
          onAccept={grantAll}
          onDecline={denyAll}
          onClose={managerOpen ? () => setManagerOpen(false) : undefined}
        />
      )}
    </ConsentContext.Provider>
  )
}
