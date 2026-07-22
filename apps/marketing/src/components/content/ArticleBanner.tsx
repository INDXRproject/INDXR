// Article header banner: a calm honeycomb field tinted with the article's category
// accent, a soft corner wash, and the title as text. No logo (the header already
// carries it). All colour comes from OKLCH design tokens, so light/dark are automatic.
//
// Per-category accent (all existing tokens, verified in styles/tokens.css):
//   Troubleshooting → --warning · Export Formats → --accent
//   Workflows → --success · Deep Dives → --violet

export type ArticleCategory = "Troubleshooting" | "Export Formats" | "Workflows" | "Deep Dives"

const CATEGORY_ACCENT: Record<ArticleCategory, { token: string; eyebrow: string }> = {
  "Troubleshooting": { token: "--warning", eyebrow: "Troubleshooting" },
  "Export Formats":  { token: "--accent",  eyebrow: "Export formats" },
  "Workflows":       { token: "--success", eyebrow: "Workflows" },
  "Deep Dives":      { token: "--violet",  eyebrow: "Deep dive" },
}

// One flat-top hex, centred at (cx,cy), side length s.
function hexPoints(cx: number, cy: number, s: number): string {
  const h = s * Math.sqrt(3)
  return [
    [cx + s, cy], [cx + s / 2, cy + h / 2], [cx - s / 2, cy + h / 2],
    [cx - s, cy], [cx - s / 2, cy - h / 2], [cx + s / 2, cy - h / 2],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
}

function Honeycomb({ color }: { color: string }) {
  const s = 22
  const h = s * Math.sqrt(3)
  const tileW = s * 3
  const tileH = h
  const id = "article-banner-hex"
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      // Fade the texture out toward the left so the title stays clean and legible.
      style={{ maskImage: "linear-gradient(to left, black, transparent 80%)", WebkitMaskImage: "linear-gradient(to left, black, transparent 80%)" }}
    >
      <defs>
        <pattern id={id} width={tileW} height={tileH} patternUnits="userSpaceOnUse">
          <polygon points={hexPoints(s, 0, s)} fill="none" stroke={color} strokeWidth="1" />
          <polygon points={hexPoints(s, tileH, s)} fill="none" stroke={color} strokeWidth="1" />
          <polygon points={hexPoints(2.5 * s, h / 2, s)} fill="none" stroke={color} strokeWidth="1" />
          <polygon points={hexPoints(-0.5 * s, h / 2, s)} fill="none" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.35" />
    </svg>
  )
}

export function ArticleBanner({ title, category }: { title: string; category?: ArticleCategory }) {
  const accent = (category && CATEGORY_ACCENT[category]) ?? CATEGORY_ACCENT["Export Formats"]
  const color = `var(${accent.token})`
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--border)] px-6 sm:px-10 py-10 sm:py-14 mb-8"
      style={{
        background: `radial-gradient(120% 160% at 12% 0%, color-mix(in oklch, ${color} 12%, transparent), transparent 55%)`,
      }}
    >
      <Honeycomb color={color} />
      <div className="relative">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          {accent.eyebrow}
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fg)]">
          {title}
        </h1>
      </div>
    </div>
  )
}
