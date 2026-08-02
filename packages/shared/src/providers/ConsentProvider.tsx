"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  ConsentChoice,
  DENIED,
  GRANTED,
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

type Region = "eea" | "row"

interface ConsentContextValue {
  /** The stored explicit choice, or null if none has been made. */
  choice: ConsentChoice | null
  region: Region
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
    setChoice(c)
    setManagerOpen(false)
  }, [])

  const denyAll = useCallback(() => {
    const c = makeChoice(DENIED)
    writeStoredChoice(c)
    pushConsentUpdate(DENIED)
    clearGoogleAdsCookies() // a withdrawal that leaves cookies is not a withdrawal
    setChoice(c)
    setManagerOpen(false)
  }, [])

  const openManager = useCallback(() => setManagerOpen(true), [])

  const value = useMemo<ConsentContextValue>(
    () => ({ choice, region, grantAll, denyAll, openManager }),
    [choice, region, grantAll, denyAll, openManager],
  )

  // Show the banner when the user opened the manager, or (EEA + no choice yet).
  const showBanner = ready && (managerOpen || (region === "eea" && choice === null))

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
