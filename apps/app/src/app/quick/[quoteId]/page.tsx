"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2 } from "lucide-react"

// Snelle balie — statuspagina na Stripe-redirect of credits-betaling (growth-plan.md §6.2
// Onderdeel B). Pollt het publieke backend-statusendpoint (beveiligd door access_token, geen
// auth) tot elk bestand een secure_url heeft of faalt. Overleeft een paginaherlaad: alle state
// zit in quick_quotes, niet in de browser.
const BACKEND_URL = process.env.NEXT_PUBLIC_AUDIO_UPLOAD_URL || "http://localhost:8000"
const POLL_MS = 3000

interface QuoteFile {
  filename: string
  job_status?: string
  secure_url?: string
}

export default function QuickCheckoutStatusPage() {
  const params = useParams<{ quoteId: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<string | null>(null)
  const [files, setFiles] = useState<QuoteFile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Missing access token.")
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/quote/${params.quoteId}?token=${token}`)
        if (!res.ok) {
          if (!cancelled) setError("Quote not found or expired.")
          return
        }
        const data = await res.json()
        if (cancelled) return
        setStatus(data.status)
        setFiles(data.files ?? [])
        const allDone = (data.files ?? []).every(
          (f: QuoteFile) => f.job_status === "complete" || f.job_status === "error" || f.secure_url
        )
        if (data.status === "pending" || !allDone) {
          timer = setTimeout(poll, POLL_MS)
        }
      } catch {
        if (!cancelled) setError("Could not check your order status.")
      }
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [params.quoteId, token])

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg mb-4">Your order</h1>
      {error && <p className="text-sm text-error">{error}</p>}
      {!error && status === "pending" && (
        <p className="text-sm text-fg-muted flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming payment…
        </p>
      )}
      {!error && files.length > 0 && (
        <div className="space-y-3 mt-4">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 text-sm">
              <span className="text-fg">{f.filename}</span>
              {f.secure_url ? (
                <a href={f.secure_url} className="text-[var(--link)] hover:underline flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> View transcript
                </a>
              ) : f.job_status === "error" ? (
                <span className="text-error">Failed — credits refunded</span>
              ) : (
                <span className="text-fg-muted flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> Transcribing…
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-fg-subtle mt-6">
        We've also emailed these links to you. They work without signing in.
      </p>
    </div>
  )
}
