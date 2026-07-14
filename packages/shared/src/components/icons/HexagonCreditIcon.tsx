import { cn } from "../../lib/utils"

/**
 * Credit token — the golden INDXR coin (hexagon mark, amber). Rendered as the
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
