"use client"

import { useState } from "react"

export function TranscriptDeleteButton({ transcriptId }: { transcriptId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (error) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-xs text-destructive">{error}</span>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setError(null)}
        >
          ×
        </button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          className="text-xs text-destructive hover:underline"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            try {
              const res = await fetch("/api/admin/delete-transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcriptId }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error)
              window.location.reload()
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Delete failed")
              setLoading(false)
              setConfirming(false)
            }
          }}
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      className="text-xs text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      Delete
    </button>
  )
}
