import { cn } from "../../lib/utils"

/** Hexagon-centered illustration with a play glyph, per wiki/design/research/batch-3b-ux-aesthetic.md §7.1 empty-state spec. */
export function HexagonEmptyState({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn("h-32 w-36", className)}
      aria-hidden="true"
    >
      {/* Six satellite hexagons, faint */}
      {[
        [40, 30],
        [120, 30],
        [20, 70],
        [140, 70],
        [40, 110],
        [120, 110],
      ].map(([cx, cy], i) => (
        <path
          key={i}
          d={`M${cx} ${cy - 16}L${cx + 14} ${cy - 8}V${cy + 8}L${cx} ${cy + 16}L${cx - 14} ${cy + 8}V${cy - 8}Z`}
          className="stroke-border-strong"
          strokeWidth="1.5"
        />
      ))}
      {/* Center hexagon, amber-filled */}
      <path
        d="M80 46 104 60V88L80 102 56 88V60Z"
        className="fill-accent-subtle stroke-accent"
        strokeWidth="1.5"
      />
      {/* Play glyph */}
      <path d="M74 66 L92 74 L74 82 Z" className="fill-accent" />
    </svg>
  )
}
