import { cn } from "../../lib/utils"

/**
 * Credit token — a coin (amber) carrying the INDXR hexagon mark in its centre.
 * Replaces the plain coin/dollar glyph wherever credits are shown; pairs with
 * the accent (amber) theme. Sits directly beside the credit count as one unit.
 */
export function HexagonCreditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0", className)}
      aria-hidden="true"
    >
      {/* Coin body */}
      <circle cx="12" cy="12" r="10.25" className="fill-accent-subtle stroke-accent" strokeWidth="1.5" />
      {/* Inner rim — coin bevel */}
      <circle cx="12" cy="12" r="7.9" className="stroke-accent/45" strokeWidth="0.9" fill="none" />
      {/* INDXR hexagon mark */}
      <path
        d="M12 7.1 16.24 9.55 16.24 14.45 12 16.9 7.76 14.45 7.76 9.55Z"
        className="fill-accent"
      />
    </svg>
  )
}
