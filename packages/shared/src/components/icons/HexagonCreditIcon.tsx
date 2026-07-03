import { cn } from "../../lib/utils"

/** Amber-filled hexagon, geometric match to the logo's 7-hexagon mark. Replaces the generic coin/dollar icon wherever credits are shown. */
export function HexagonCreditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M12 1.5 21.79 7v10L12 22.5 2.21 17V7Z"
        className="fill-accent-subtle stroke-accent"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M12 6 17.2 9v6L12 18l-5.2-3V9Z"
        className="fill-accent"
      />
    </svg>
  )
}
