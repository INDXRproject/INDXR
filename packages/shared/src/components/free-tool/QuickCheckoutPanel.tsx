"use client"

import { useEffect, useRef, useState } from "react"
import { UploadCloud, FileAudio, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import posthog from "posthog-js"
import { Button } from "../ui/button"
import { marketingHref } from "../../lib/cross-host-links"
import { PACKAGES, formatEur, cheapestCoveringPackage } from "../../lib/pricing"
import { UPLOAD_EXTENSIONS, UPLOAD_ACCEPT_ATTR, UPLOAD_MAX_FILE_MB } from "../../lib/uploadFormats"

// growth-plan.md §6.2 Onderdeel D + §6.3 H3/H4/H5/H6: via/kw (+ gclid) are first-touch-captured
// into the indxr_acq cookie by AcquisitionCapture — read them back out here so the balie's
// PostHog events and the Stripe session metadata carry attribution through to
// quick_purchase_completed (webhook).
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

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatMinutes(durationSeconds: number | null): string {
  if (!durationSeconds) return "estimating…"
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`
}

// Snelle balie (growth-plan.md §6.2 Onderdeel B, §6.3 H3-H6): anonieme upload → offerte → gratis
// voorproefje → betalen per bestand, geen account nodig. Vervangt de harde login-wall die
// AudioTab.tsx tot nu toe aan anonieme bezoekers toonde. Ingelogde gebruikers met een account
// blijven op het bestaande AudioTab-pad (credits, library) — dit component is uitsluitend het
// anonieme pad.
const BACKEND_URL = process.env.NEXT_PUBLIC_AUDIO_UPLOAD_URL || "http://localhost:8000"
const MAX_FILES = 5
const PREVIEW_POLL_MS = 3000
const PREVIEW_POLL_MAX_ATTEMPTS = 40 // 40 * 3s = 2 min ceiling (H3)

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
  const [isDragging, setIsDragging] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewTrackedRef = useRef(false)
  const pollAttemptsRef = useRef(0)

  const coveringPkg = quote ? cheapestCoveringPackage(quote.total_credits) : null
  const showPackageAlt = !!(coveringPkg && quote && coveringPkg.priceEur < quote.total_price_cents / 100)

  // H3: poll the free-preview status until every file is ready/failed, or PREVIEW_POLL_MAX_ATTEMPTS
  // is reached (hard ceiling — a stuck AssemblyAI job must not poll forever).
  useEffect(() => {
    if (!quote) return
    const allDone = quote.files.every((f) => f.preview_status !== "pending")
    if (allDone || pollAttemptsRef.current >= PREVIEW_POLL_MAX_ATTEMPTS) return

    const timer = setTimeout(async () => {
      pollAttemptsRef.current += 1
      try {
        const res = await fetch(`${BACKEND_URL}/api/quote/${quote.quote_id}?token=${quote.access_token}`)
        if (!res.ok) return
        const data = await res.json()
        setQuote((prev) => (prev ? { ...prev, files: data.files } : prev))
      } catch {
        // transient — the next tick retries
      }
    }, PREVIEW_POLL_MS)
    return () => clearTimeout(timer)
  }, [quote])

  // preview_viewed fires once, the first time any file's free preview becomes ready while this
  // quote is on screen — not on mount (nothing to view yet) and not once per file.
  useEffect(() => {
    if (previewTrackedRef.current || !quote) return
    if (quote.files.some((f) => f.preview_status === "ready")) {
      previewTrackedRef.current = true
      posthog.capture("preview_viewed", { quote_id: quote.quote_id, ...readAcquisitionCookie() })
    }
  }, [quote])

  function addFiles(newFiles: File[]) {
    setError(null)
    const valid: File[] = []
    for (const f of newFiles) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase()
      if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
        setError(`"${f.name}" is not a supported file type.`)
        continue
      }
      if (f.size > UPLOAD_MAX_FILE_MB * 1024 * 1024) {
        setError(`"${f.name}" is too large (max ${UPLOAD_MAX_FILE_MB} MB).`)
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES))
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files ?? []))
  }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ""
  }

  async function getQuote() {
    if (!files.length) return
    setLoading(true)
    setError(null)
    pollAttemptsRef.current = 0
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
      const totalDurationSeconds = (data.files ?? []).reduce(
        (sum: number, f: QuoteFile) => sum + (f.duration_seconds ?? 0),
        0,
      )
      posthog.capture("quote_shown", {
        quote_id: data.quote_id,
        file_count: data.files?.length ?? 0,
        duration_seconds: totalDurationSeconds,
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
      // /api/quick-checkout is an apps/app route. QuickCheckoutPanel only renders inside the app
      // (AudioTab) — not embedded on the marketing domain, see FreeToolEmbed.tsx — so this is
      // always same-origin; a relative path is correct and avoids a cross-origin/CORS/cookie path.
      const res = await fetch("/api/quick-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quote_id,
          accessToken: quote.access_token,
          termsAccepted: true,
          via: acq.via,
          kw: acq.kw,
          gclid: acq.gclid,
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
        <div className="space-y-4 mb-4">
          {quote.files.map((f, i) => (
            <div key={i} className="border-b border-border-subtle pb-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-fg">{f.filename}</p>
                  {/* H4: show the measured duration next to the price */}
                  <p className="text-fg-muted text-xs">{formatMinutes(f.duration_seconds)}</p>
                </div>
                <p className="text-fg font-medium">{formatEur(f.price_cents / 100)}</p>
              </div>
              {/* H3: render the free preview once it's ready, poll while pending, show failures honestly */}
              {f.preview_status === "pending" && (
                <p className="text-xs text-fg-muted mt-2 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Preparing free preview…
                </p>
              )}
              {f.preview_status === "failed" && (
                <p className="text-xs text-fg-muted mt-2">Preview unavailable — the full transcript still works.</p>
              )}
              {f.preview_status === "ready" && f.preview_text && (
                <div className="mt-2 rounded-md border border-border-subtle bg-surface-elevated/40 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs text-fg-subtle mb-1">Free preview (first part, up to 3 min)</p>
                  <p className="text-sm text-fg-muted leading-relaxed">{f.preview_text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-fg font-semibold">Total</p>
          <p className="text-fg font-semibold">{formatEur(quote.total_price_cents / 100)}</p>
        </div>
        {/* H5: only show a package alternative when it is honestly cheaper than paying per file */}
        {showPackageAlt && coveringPkg && (
          <p className="text-xs text-fg-subtle mb-4">
            Or {coveringPkg.credits.toLocaleString()} minutes for {formatEur(coveringPkg.priceEur)} with a credit
            pack — keep {(coveringPkg.credits - quote.total_credits).toLocaleString()} minutes left.
          </p>
        )}
        <label className="flex items-start gap-2.5 text-sm text-fg-muted mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          {/* growth-plan.md §6.3 H8 (akkoord Khidr, §7 punt 7): per-bestand-betaling levert
              onmiddellijk, dus de afstand van het 14-dagen-herroepingsrecht moet letterlijk in dit
              label staan — alleen verwijzen naar de voorwaarden is niet genoeg (ADR-069 addendum). */}
          <span>
            I agree to the{" "}
            <a href={marketingHref("/terms")} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={marketingHref("/privacy")} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] hover:underline">
              Privacy Policy
            </a>
            , and I ask INDXR to start right away. I understand I lose my 14-day right of
            withdrawal once my transcript is delivered.
          </span>
        </label>
        {error && <p className="text-sm text-error mb-3">{error}</p>}
        <Button onClick={pay} disabled={!accepted || payLoading} className="w-full">
          {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${formatEur(quote.total_price_cents / 100)}`}
        </Button>
      </div>
    )
  }

  // H6: dashed-border dropzone + label-based native input (iOS-safe, same pattern as AudioTab),
  // multi-file variant — a card per selected file instead of a single-file state.
  return (
    <div className="mt-8 space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          ${files.length ? "p-5" : "p-12"} rounded-2xl border-2 border-dashed transition-all
          ${isDragging
            ? "border-primary bg-accent/10 scale-105"
            : "border-border bg-surface-elevated/10 hover:bg-surface-elevated/20"
          }
        `}
      >
        <input
          id="quick-checkout-upload-input"
          type="file"
          multiple
          accept={UPLOAD_ACCEPT_ATTR}
          onChange={handleFileSelect}
          className="ph-no-capture absolute -left-[9999px] top-0 h-px w-px opacity-0"
        />
        {files.length === 0 ? (
          <label htmlFor="quick-checkout-upload-input" className="flex flex-col items-center justify-center text-center cursor-pointer">
            <div className="p-4 bg-surface-elevated rounded-full mb-4">
              <UploadCloud className="h-8 w-8 text-fg-muted" />
            </div>
            <h3 className="text-xl font-semibold text-fg mb-2">No account needed</h3>
            <p className="text-fg-muted mb-2">Drag and drop your file here, or tap to choose a file</p>
            <p className="text-sm text-fg-muted">
              See the price, get a free 3-minute preview, then pay per file (max {MAX_FILES} files)
            </p>
          </label>
        ) : (
          <div className="space-y-3">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-success-subtle px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm text-fg">{f.name}</p>
                    <p className="text-xs text-fg-muted">{formatFileSize(f.size)}</p>
                  </div>
                </div>
                <button onClick={() => removeFile(i)} className="text-fg-muted hover:text-fg" aria-label="Remove file">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <label htmlFor="quick-checkout-upload-input" className="block text-center text-sm text-[var(--link)] hover:underline cursor-pointer">
                + Add another file
              </label>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-error flex items-center justify-center gap-1">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="text-center">
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
    </div>
  )
}
