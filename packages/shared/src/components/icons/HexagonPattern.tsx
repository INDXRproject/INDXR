import { cn } from "../../lib/utils"

interface HexagonPatternProps {
  /** Hex side length in SVG user units — controls cell size. */
  size?: number
  className?: string
}

/**
 * Seamless flat-top honeycomb tessellation, rendered as an absolutely-positioned
 * background layer. Intended for very low opacity (0.03–0.05) — see
 * docs/wiki/design/research/batch-3b-ux-aesthetic.md §5.4 for the working-surface
 * exception this component was built for.
 */
export function HexagonPattern({ size = 20, className }: HexagonPatternProps) {
  const s = size
  const h = s * Math.sqrt(3)
  const tileW = s * 3
  const tileH = h

  const hexPoints = (cx: number, cy: number) =>
    [
      [cx + s, cy],
      [cx + s / 2, cy + h / 2],
      [cx - s / 2, cy + h / 2],
      [cx - s, cy],
      [cx - s / 2, cy - h / 2],
      [cx + s / 2, cy - h / 2],
    ]
      .map((p) => p.map((n) => Number(n.toFixed(2))).join(","))
      .join(" ")

  const patternId = "indxr-hex-pattern"

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} width={tileW} height={tileH} patternUnits="userSpaceOnUse">
          {/* Column A — canonical center on the tile's vertical boundary, needs 2 copies */}
          <polygon points={hexPoints(s, 0)} className="fill-none stroke-fg" strokeWidth="1" />
          <polygon points={hexPoints(s, tileH)} className="fill-none stroke-fg" strokeWidth="1" />
          {/* Column B — offset canonical center on the tile's horizontal boundary, needs 2 copies */}
          <polygon points={hexPoints(2.5 * s, h / 2)} className="fill-none stroke-fg" strokeWidth="1" />
          <polygon points={hexPoints(-0.5 * s, h / 2)} className="fill-none stroke-fg" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}
