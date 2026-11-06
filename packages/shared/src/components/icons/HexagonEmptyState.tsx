import { cn } from "../../lib/utils"

/** Empty-state mark (stijl B, 2026-11-06): the three-line INDXR mark in ink + amber, replacing the
 *  old hexagon cluster. Name kept so callers don't change. */
export function HexagonEmptyState({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 46 50" fill="none" className={cn("h-16 w-16", className)} aria-hidden="true">
      <rect x="0" y="0" width="36" height="10" className="fill-fg-strong" />
      <rect x="1.4" y="20" width="43.2" height="10" className="fill-accent stroke-fg-strong" strokeWidth="2.75" />
      <rect x="0" y="40" width="25" height="10" className="fill-fg-strong" />
    </svg>
  )
}
