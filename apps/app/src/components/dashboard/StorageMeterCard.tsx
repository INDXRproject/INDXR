"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import {
  STORAGE_BLOCK_MB,
  STORAGE_BLOCK_COST_CREDITS,
  LIBRARY_STORAGE_MAX_MB,
  BYTES_PER_MB,
} from "@indxr/shared/lib/storage"
import { purchaseStorageAction } from "@/app/actions/storage"

// Library-storage meter + upgrade action. THE single storage purchase surface — rendered on both
// /dashboard/account and /dashboard (the Home page passes headless so its section label supplies
// the heading). One confirm step, one debit path (purchaseStorageAction → purchase_library_space),
// so there is never a second implementation of the credit-deducting action.
//
// Reads the real footprint (user_credits.library_bytes) against the effective cap
// (library_bytes_cap + library_bytes_bonus, from the DB). At the hard cap (500 MB) the buy button
// is disabled with an explanation — the RPC also refuses, so no silent failure and no wasted debit.
export function StorageMeterCard({
  libraryBytes,
  capBytes,
  headless = false,
}: {
  libraryBytes: number
  capBytes: number
  headless?: boolean
}) {
  const router = useRouter()
  const [buying, setBuying] = useState(false)
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const usedMB = libraryBytes / BYTES_PER_MB
  const capMB = capBytes / BYTES_PER_MB
  const pct = capMB > 0 ? Math.min(100, Math.max(0, (usedMB / capMB) * 100)) : 0
  const over = libraryBytes >= capBytes
  const near = pct >= 80
  const atMax = capBytes >= LIBRARY_STORAGE_MAX_MB * BYTES_PER_MB
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
      {!headless && (
        <>
          <h2 className="text-lg font-semibold text-fg mb-1">Library storage</h2>
          <p className="text-sm text-fg-muted mb-5">
            How much space your saved transcripts, edits, summaries, and exports take up.
          </p>
        </>
      )}

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
            <a href="/dashboard/library" className="text-[var(--accent)] hover:underline">library</a>
            {atMax ? "" : ", or buy more room below"}. Your existing transcripts are safe.
          </p>
        </div>
      ) : (
        <p className="text-xs text-fg-muted mt-3">
          When you hit the limit, new transcripts pause until you free up space or buy more. Existing
          transcripts are never touched.
        </p>
      )}

      {atMax ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button disabled variant="outline" size="sm">
            Buy +{STORAGE_BLOCK_MB} MB — {STORAGE_BLOCK_COST_CREDITS} credits
          </Button>
          <span className="text-xs text-fg-muted">
            You&apos;ve reached the maximum library storage ({LIBRARY_STORAGE_MAX_MB} MB). Delete transcripts to free space.
          </span>
        </div>
      ) : confirming ? (
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
