"use client"

import { useEffect, useRef, useState } from "react"
import { UploadCloud, Loader2, AlertCircle } from "lucide-react"
import posthog from "posthog-js"
import { Button } from "../ui/button"
import { marketingHref } from "../../lib/cross-host-links"
import { PACKAGES, formatEur } from "../../lib/pricing"
import { UPLOAD_ACCEPT_ATTR } from "../../lib/uploadFormats"

// growth-plan.md §6.2 Onderdeel D: via/kw (+ gclid) are first-touch-captured into the indxr_acq
// cookie by AcquisitionCapture — read them back out here so the balie's PostHog events and the
// Stripe session metadata carry attribution through to quick_purchase_completed (webhook).
function readAcquisitionCookie(): { via?: string; kw?: string; gclid?: string } {
  if (typeof document === "undefined") return {}
  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith("indxr_acq="))?.split("=")[1]
    if (!raw) return {}
    const acq = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    return {
      via: typeof acq.via === "string" ? acq.via : undefined,
      kw: typeof acq.kw === "string" ? acq.kw : undefined,
      gclid: typeof acq.gclid === "string" ? acq.gclid : undefined,
    }
  } catch {
    return {}
  }
}

// Snelle balie (growth-plan.md §6.2 Onderdeel B): anonieme upload → offerte → gratis
// voorproefje → betalen per bestand, geen account nodig. Vervangt de harde login-wall die
// AudioTab.tsx tot nu toe aan anonieme bezoekers toonde. Ingelogde gebruikers met een account
// blijven op het bestaande AudioTab-pad (credits, library) — dit component is uitsluitend het
// anonieme pad.
const BACKEND_URL = process.env.NEXT_PUBLIC_AUDIO_UPLOAD_URL || "http://localhost:8000"
const MAX_FILES = 5

interface QuoteFile {
  filename: string
  duration_seconds: number | null
  credits: number
  price_cents: number
  preview_status: "pending" | "ready" | "failed"
  preview_text: string | null
}

interface Quote {
  quote_id: string
  access_token: string
  files: QuoteFile[]
  total_credits: number
  total_price_cents: number
}

export function QuickCheckoutPanel() {
  const [files, setFiles] = useState<File[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewTrackedRef = useRef(false)

  const anchorPkg = PACKAGES.find((p) => p.mostPopular) ?? PACKAGES[0]

  // preview_viewed fires once, the first time any file's free preview becomes ready while this
  // quote is on screen — not on mount (nothing to view yet) and not once per file.
  useEffect(() => {
    if (previewTrackedRef.current || !quote) return
    if (quote.files.some((f) => f.preview_status === "ready")) {
      previewTrackedRef.current = true
      posthog.capture("preview_viewed", { quote_id: quote.quote_id, ...readAcquisitionCookie() })
    }
  }, [quote])

  async function getQuote() {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      files.forEach((f) => form.append("files", f))
      const res = await fetch(`${BACKEND_URL}/api/quote/create`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not price these files. Try again.")
        return
      }
      setQuote(data)
      posthog.capture("quote_shown", {
        quote_id: data.quote_id,
        file_count: data.files?.length ?? 0,
        total_credits: data.total_credits,
        total_price_cents: data.total_price_cents,
        ...readAcquisitionCookie(),
      })
    } catch {
      setError("Something went wrong getting a price. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function pay() {
    if (!quote || !accepted) return
    setPayLoading(true)
    setError(null)
    const acq = readAcquisitionCookie()
    posthog.capture("checkout_started", { quote_id: quote.quote_id, total_price_cents: quote.total_price_cents, ...acq })
    try {
      const res = await fetch("/api/quick-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quote_id,
          accessToken: quote.access_token,
          termsAccepted: true,
          via: acq.via,
          kw: acq.kw,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not start payment. Try again.")
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else if (data.paidWithCredits) {
        window.location.href = `/quick/${quote.quote_id}?token=${quote.access_token}`
      }
    } catch {
      setError("Something went wrong starting payment. Try again.")
    } finally {
      setPayLoading(false)
    }
  }

  if (quote) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h3 className="text-lg font-semibold text-fg mb-4">Your quote</h3>
        <div className="space-y-3 mb-4">
          {quote.files.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-border-subtle pb-2">
              <div>
                <p className="text-fg">{f.filename}</p>
                <p className="text-fg-muted text-xs">
                  {f.preview_status === "ready" && "Preview ready"}
                  {f.preview_status === "pending" && "Preparing free preview…"}
                  {f.preview_status === "failed" && "Preview unavailable — full transcript still works"}
                </p>
              </div>
              <p className="text-fg font-medium">{formatEur(f.price_cents / 100)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-fg font-semibold">Total</p>
          <p className="text-fg font-semibold">{formatEur(quote.total_price_cents / 100)}</p>
        </div>
        <p className="text-xs text-fg-subtle mb-4">
          Or {anchorPkg.credits.toLocaleString()} minutes for {formatEur(anchorPkg.priceEur)} with a credit pack —
          cheaper if you'll transcribe more later.
        </p>
        <label className="flex items-start gap-2.5 text-sm text-fg-muted mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            I agree to the{" "}
            <a href={marketingHref("/terms")} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={marketingHref("/privacy")} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] hover:underline">
              Privacy Policy
            </a>.
          </span>
        </label>
        {error && <p className="text-sm text-error mb-3">{error}</p>}
        <Button onClick={pay} disabled={!accepted || payLoading} className="w-full">
          {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${formatEur(quote.total_price_cents / 100)}`}
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-lg border border-border bg-surface p-6 text-center">
      <UploadCloud className="h-10 w-10 text-fg-muted mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-fg mb-1">No account needed</h3>
      <p className="text-sm text-fg-muted mb-4">
        Upload a file and see the price. First 3 minutes transcribed free, before you pay.
      </p>
      <input
        type="file"
        multiple
        accept={UPLOAD_ACCEPT_ATTR}
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_FILES))}
        className="mb-3 text-sm text-fg-muted"
      />
      {files.length > 0 && (
        <p className="text-xs text-fg-subtle mb-3">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
      )}
      {error && (
        <p className="text-sm text-error mb-3 flex items-center justify-center gap-1">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      <Button onClick={getQuote} disabled={!files.length || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get a price"}
      </Button>
      <p className="text-xs text-fg-subtle mt-4">
        Or{" "}
        <a href={marketingHref("/login")} className="text-[var(--link)] hover:underline">
          sign in
        </a>{" "}
        for an account with saved credits and a transcript library.
      </p>
    </div>
  )
}
