"use client"

import { useState } from "react"
import { ExternalLink, Loader2, FileText } from "lucide-react"

// Per aankoop-rij: toont "Download invoice" als de factuur al bestaat, anders
// "Request invoice" die de on-demand factuur-route aanroept. Faalt de aanmaak, dan
// een nette foutmelding — credits/saldo worden nooit geraakt.
export function InvoiceButton({ transactionId, initialUrl }: { transactionId: string; initialUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline whitespace-nowrap"
      >
        Download invoice <ExternalLink className="h-3 w-3" />
      </a>
    )
  }

  const requestInvoice = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.invoice_url) {
        throw new Error(data.error || "Could not generate invoice")
      }
      setUrl(data.invoice_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate invoice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={requestInvoice}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg disabled:opacity-60 whitespace-nowrap cursor-pointer"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
        {loading ? "Generating…" : "Request invoice"}
      </button>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  )
}
