import { cn } from "@indxr/shared/lib/utils"

// Compact library-storage meter for the Home page, shown beside the credit balance. Reads the
// real footprint + the user's effective cap (passed in from the server). Full detail + buying
// space live on the account page.
export function HomeStorageMeter({ libraryBytes, capBytes }: { libraryBytes: number; capBytes: number }) {
  const MB = 1024 * 1024
  const usedMB = libraryBytes / MB
  const capMB = capBytes / MB
  const pct = capMB > 0 ? Math.min(100, Math.max(0, (usedMB / capMB) * 100)) : 0
  const over = libraryBytes >= capBytes
  const fmt = (mb: number) => (mb < 10 ? mb.toFixed(1) : Math.round(mb).toString())

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm text-fg-muted">Library storage</span>
        <span className="text-xs text-fg-muted tabular-nums">{fmt(usedMB)} / {fmt(capMB)} MB</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
        <div
          className={cn("h-full rounded-full", over ? "bg-error" : pct >= 80 ? "bg-warning" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-fg-muted mt-1.5">
        {over ? (
          <>Full — <a href="/dashboard/account" className="text-accent hover:underline">free up or buy space</a></>
        ) : (
          <a href="/dashboard/account" className="hover:text-fg transition-colors">Manage storage</a>
        )}
      </p>
    </div>
  )
}
