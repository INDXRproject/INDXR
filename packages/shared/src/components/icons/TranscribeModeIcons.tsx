import { cn } from "../../lib/utils"

/**
 * Transcribe mode-strip icons — the only custom icons in the product UI besides
 * HexagonCreditIcon. Built on the house hexagon motif (pointy-top, the same
 * geometry as HexagonEmptyState / HexagonPattern), not Lucide, so the mode strip
 * reads as brand rather than generic tabs.
 *
 * Spec (per redesign brief / ADR-079): 24×24 viewBox, fill none, stroke
 * currentColor, stroke-width 1.75, round join + cap. That weight deliberately
 * matches Lucide (system.md §4) so these sit next to the Lucide nav icons without
 * a style break. Colour comes from currentColor: the active mode-cell drives it to
 * --accent, inactive inherits --fg-muted. Rendered at 18px in the strip.
 *
 * Do NOT thicken the stroke to fight legibility at small sizes — that breaks the
 * Lucide match. If an inner glyph clogs, drop inner elements instead.
 */

const HEX_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
}

// Pointy-top hexagon outline, centred in a 24×24 box (matches the house geometry).
const HEX_OUTLINE = "M12 2.8 L20 7.4 L20 16.6 L12 21.2 L4 16.6 L4 7.4 Z"

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      {...HEX_PROPS}
      className={cn("size-[18px]", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Video — hexagon outline with a play triangle inside. */
export function VideoModeIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d={HEX_OUTLINE} />
      <path d="M10.2 8.7 L16 12 L10.2 15.3 Z" />
    </Svg>
  )
}

/** Playlist — a small hexagon marker on the left with three list lines on the right. */
export function PlaylistModeIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      {/* small pointy-top hexagon marker */}
      <path d="M6.5 3.8 L10.4 6.1 L10.4 10.7 L6.5 13 L2.6 10.7 L2.6 6.1 Z" />
      {/* three list lines */}
      <path d="M14 6.5 H21" />
      <path d="M14 12 H21" />
      <path d="M14 17.5 H21" />
    </Svg>
  )
}

/** Audio — hexagon outline with three waveform bars inside. */
export function AudioModeIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d={HEX_OUTLINE} />
      <path d="M9 10.2 V13.8" />
      <path d="M12 7.8 V16.2" />
      <path d="M15 10.8 V13.2" />
    </Svg>
  )
}
