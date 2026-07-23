// Deterministic honeycomb field — the ArticleBanner hexagon turned into a reusable,
// *seeded* component. The same `seed` (a slug or pathname) always produces the same
// constellation of accent-filled cells, so a page's texture is stable across renders and
// distinct from its neighbours. Outlines use --border and fills use the passed accent
// token, so it moves with light/dark automatically. Purely decorative (aria-hidden), no
// network request. Uses a small pure PRNG (no Math.random / Date), so server and client
// render identically — no hydration mismatch.

// FNV-1a string hash → 32-bit seed.
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32 — deterministic PRNG from a 32-bit seed.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One flat-top hexagon, centred at (cx,cy), side length s.
function hexPoints(cx: number, cy: number, s: number): string {
  const h = s * Math.sqrt(3)
  return [
    [cx + s, cy],
    [cx + s / 2, cy + h / 2],
    [cx - s / 2, cy + h / 2],
    [cx - s, cy],
    [cx - s / 2, cy - h / 2],
    [cx + s / 2, cy - h / 2],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ")
}

interface HexFieldProps {
  /** Same seed → same pattern. */
  seed: string
  /** Accent CSS colour for the seeded fills, e.g. "var(--accent)". */
  color: string
  /** Fade the field out toward the left so overlaid text stays legible. */
  fade?: boolean
  className?: string
}

const W = 480
const H = 270
const S = 24

export function HexField({ seed, color, fade = false, className }: HexFieldProps) {
  const hh = S * Math.sqrt(3)
  // Build the lattice covering the viewBox with one cell of margin all round.
  const cells: Array<[number, number]> = []
  for (let col = -1; col * 1.5 * S < W + S; col++) {
    for (let row = -1; row * hh < H + hh; row++) {
      const cx = col * 1.5 * S
      const cy = row * hh + (Math.abs(col) % 2 === 1 ? hh / 2 : 0)
      cells.push([cx, cy])
    }
  }
  // Seeded pick of which cells get an accent fill (~14% of them).
  const rand = mulberry32(hashSeed(seed))
  const filled = cells.map(() => rand() < 0.14)

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      style={
        fade
          ? {
              maskImage: "linear-gradient(to left, black, transparent 80%)",
              WebkitMaskImage: "linear-gradient(to left, black, transparent 80%)",
            }
          : undefined
      }
    >
      {cells.map(([cx, cy], i) => (
        <polygon
          key={i}
          points={hexPoints(cx, cy, S)}
          fill={filled[i] ? color : "none"}
          fillOpacity={filled[i] ? 0.16 : 0}
          stroke="var(--border)"
          strokeOpacity={0.55}
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}
