import { cn } from "../../lib/utils"

/**
 * Credit token — the flat amber INDXR coin with the three-line logo mark (style B,
 * 2026-11-05; component name kept from the old hexagon coin). Rendered as the
 * shared brand asset so every credit display (topbar pill, sidebar counter,
 * account balance) shows the same mark. Served from each app's /public.
 * Keeps the `size-4 shrink-0` default so callers can override via className
 * without any layout shift.
 */
export function HexagonCreditIcon({ className }: { className?: string }) {
  return (
    <img
      src="/credit-coin.png"
      alt=""
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    />
  )
}
