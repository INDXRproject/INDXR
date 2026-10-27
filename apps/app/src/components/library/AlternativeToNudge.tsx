"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

// Unobtrusive like-request (akkoord Khidr, 2026-10-27) — a single dismissible line, never a
// popup. Dismissal persists in localStorage; reads/writes are wrapped in try/catch since
// localStorage can throw (private browsing, storage disabled).
const STORAGE_KEY = "indxr-alternativeto-nudge-dismissed"

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "true")
  } catch {
    /* best-effort — a failed write just means it may show again next time */
  }
}

export function AlternativeToNudge() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  if (dismissed) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3 text-xs text-fg-subtle">
      <span>
        Did INDXR help? A{" "}
        <a
          href="https://alternativeto.net/software/indxr-ai/about/"
          target="_blank"
          rel="noopener"
          className="text-[var(--link)] hover:underline"
        >
          like or a short review on AlternativeTo
        </a>{" "}
        helps a solo developer get found.
      </span>
      <button
        type="button"
        onClick={() => {
          writeDismissed()
          setDismissed(true)
        }}
        aria-label="Dismiss"
        className="text-fg-muted hover:text-fg transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
