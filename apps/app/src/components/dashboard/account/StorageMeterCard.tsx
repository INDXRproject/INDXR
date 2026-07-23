import { LIBRARY_STORAGE_LIMIT_MB } from "@indxr/shared/lib/storage"
import { cn } from "@indxr/shared/lib/utils"

// Library-storage meter for the account page. Reads the real byte footprint from the database
// (user_credits.library_bytes) and shows it against the display limit (LIBRARY_STORAGE_LIMIT_MB).
// It's a guide only — nothing is enforced when a user goes over (the DB cap is a separate,
// unenforced 5 GiB). Presentational + server-safe (no hooks, plain bar).
export function StorageMeterCard({ libraryBytes }: { libraryBytes: number }) {
  const usedMB = libraryBytes / (1024 * 1024)
  const limitMB = LIBRARY_STORAGE_LIMIT_MB
  const pct = Math.min(100, Math.max(0, (usedMB / limitMB) * 100))
  const over = usedMB > limitMB
  const usedLabel = usedMB < 0.1
    ? `${Math.round(libraryBytes / 1024)} KB`
    : `${usedMB.toFixed(usedMB < 10 ? 1 : 0)} MB`

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-fg mb-1">Library storage</h2>
      <p className="text-sm text-fg-muted mb-5">
        How much space your saved transcripts, edits, summaries, and exports take up.
      </p>

      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-fg tabular-nums">{usedLabel}</span>
        <span className="text-xs text-fg-muted tabular-nums">of {limitMB} MB</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", over ? "bg-warning" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-fg-muted mt-3">
        This is a guide, not a hard limit — nothing is blocked if you go over it, and you won&apos;t be
        charged for storage.
      </p>
    </div>
  )
}
