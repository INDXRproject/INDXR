"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { WINDOW_KEYS } from "../adminTypes"

const WINDOW_LABELS: Record<string, string> = { "24h": "24h", "7d": "7d", "30d": "30d", "all": "All" }

// Shared time-window (+ optional test toggle) for the Operations and Growth tabs. Writes the choice to the
// URL (?w=, ?test=) so the server component re-reads it and re-queries the RPC with the matching window.
export function DashboardControls({ showTest = false }: { showTest?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const w = params.get("w") ?? "7d"
  const test = params.get("test") ?? "all"

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString())
    next.set(k, v)
    router.push(`${pathname}?${next.toString()}`)
  }

  const seg = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-sm transition-colors ${
      active ? "bg-surface-elevated font-medium text-fg" : "text-fg-muted hover:text-fg"
    }`

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border bg-surface p-0.5">
        {WINDOW_KEYS.map((k) => (
          <button key={k} onClick={() => set("w", k)} className={seg(w === k)}>
            {WINDOW_LABELS[k]}
          </button>
        ))}
      </div>
      {showTest && (
        <div className="inline-flex rounded-lg border bg-surface p-0.5">
          <button onClick={() => set("test", "all")} className={seg(test === "all")}>All traffic</button>
          <button onClick={() => set("test", "real")} className={seg(test === "real")}>Real users only</button>
        </div>
      )}
    </div>
  )
}
