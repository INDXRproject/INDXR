"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { STORAGE_BLOCK_MB, STORAGE_BLOCK_COST_CREDITS } from "@indxr/shared/lib/storage"
import { purchaseStorageAction } from "@/app/actions/storage"

// Library-storage meter for the account page. Shows the real footprint (user_credits.library_bytes)
// against the user's effective cap (library_bytes_cap + library_bytes_bonus, from the DB — the limit
// is per-user, not a frontend constant). The limit is enforced: over it, new transcripts are blocked.
// From here a user can buy permanent extra space (a credit-sink) or delete transcripts.
export function StorageMeterCard({ libraryBytes, capBytes }: { libraryBytes: number; capBytes: number }) {
  const router = useRouter()
  const [buying, setBuying] = useState(false)
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const MB = 1024 * 1024
  const usedMB = libraryBytes / MB
  const capMB = capBytes / MB
  const pct = capMB > 0 ? Math.min(100, Math.max(0, (usedMB / capMB) * 100)) : 0
  const over = libraryBytes >= capBytes
  const near = pct >= 80
  const fmt = (mb: number) => (mb < 10 ? mb.toFixed(1) : Math.round(mb).toString())

  const buy = async () => {
    setBuying(true)
    setMsg(null)
    const res = await purchaseStorageAction(1)
    if (res.success) {
      setMsg({ type: "success", text: `Added ${STORAGE_BLOCK_MB} MB. Your new balance is ${res.newBalance} credits.` })
      setConfirming(false)
      router.refresh()
    } else {
      setMsg({ type: "error", text: res.error })
    }
    setBuying(false)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-fg mb-1">Library storage</h2>
      <p className="text-sm text-fg-muted mb-5">
        How much space your saved transcripts, edits, summaries, and exports take up.
      </p>

      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-fg tabular-nums">{fmt(usedMB)} MB</span>
        <span className="text-xs text-fg-muted tabular-nums">of {fmt(capMB)} MB</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", over ? "bg-error" : near ? "bg-warning" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {over ? (
        <div className="mt-4 rounded-lg border border-error/20 bg-error-subtle px-4 py-3">
          <p className="text-sm font-medium text-error-fg dark:text-error">Your library is full.</p>
          <p className="text-sm text-fg-subtle mt-1">
            New transcripts are paused until you free up space. Delete some transcripts from your{" "}
            <a href="/dashboard/library" className="text-[var(--accent)] hover:underline">library</a>, or buy
            more room below. Your existing transcripts are safe.
          </p>
        </div>
      ) : (
        <p className="text-xs text-fg-muted mt-3">
          When you hit the limit, new transcripts pause until you free up space or buy more. Existing
          transcripts are never touched.
        </p>
      )}

      {confirming ? (
        <div className="mt-4 rounded-lg border border-border bg-surface-elevated/40 px-4 py-3">
          <p className="text-sm text-fg">
            Spend <strong>{STORAGE_BLOCK_COST_CREDITS} credits</strong> for a permanent{" "}
            <strong>+{STORAGE_BLOCK_MB} MB</strong> of library storage?
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={buy} disabled={buying} size="sm">
              {buying ? "Adding…" : "Confirm"}
            </Button>
            <Button onClick={() => setConfirming(false)} disabled={buying} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => { setMsg(null); setConfirming(true) }}
            variant={over ? "default" : "outline"}
            size="sm"
          >
            Buy +{STORAGE_BLOCK_MB} MB — {STORAGE_BLOCK_COST_CREDITS} credits
          </Button>
          <span className="text-xs text-fg-muted">Extra space is permanent, like your credits.</span>
        </div>
      )}

      {msg && (
        <p className={cn("text-sm mt-3", msg.type === "error" ? "text-error" : "text-success")}>{msg.text}</p>
      )}
    </div>
  )
}
