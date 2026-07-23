// Article header. When the article has an editorial photo it shows a full-width 16:9 image
// (srcset 800/1440, high priority as the LCP element) with the category eyebrow + title
// below — so the photo carried on the /articles card is also shown on the article itself.
// When no photo exists the header falls back to the seeded hexagon field (the old
// ArticleBanner look), tinted with the category accent. All colour comes from OKLCH tokens,
// so light/dark are automatic.
//
// Per-category accent (all existing tokens, verified in styles/tokens.css):
//   Troubleshooting → --warning · Export Formats → --accent
//   Workflows → --success · Deep Dives → --violet
import { EditorialImage } from "./EditorialImage"
import { HexField } from "./HexField"
import { editorialAlt, hasEditorialImage } from "@/lib/editorialAlts"

export type ArticleCategory = "Troubleshooting" | "Export Formats" | "Workflows" | "Deep Dives"

const CATEGORY_ACCENT: Record<ArticleCategory, { token: string; eyebrow: string }> = {
  "Troubleshooting": { token: "--warning", eyebrow: "Troubleshooting" },
  "Export Formats":  { token: "--accent",  eyebrow: "Export formats" },
  "Workflows":       { token: "--success", eyebrow: "Workflows" },
  "Deep Dives":      { token: "--violet",  eyebrow: "Deep dive" },
}

export function ArticleHero({
  title,
  category,
  slug,
}: {
  title: string
  category?: ArticleCategory
  slug?: string
}) {
  const accent = (category && CATEGORY_ACCENT[category]) ?? CATEGORY_ACCENT["Export Formats"]
  const color = `var(${accent.token})`
  const eyebrow = (
    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
      {accent.eyebrow}
    </span>
  )
  const heading = (
    <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fg)]">{title}</h1>
  )

  if (hasEditorialImage(slug)) {
    return (
      <header className="mb-8">
        {/* Article column is max-w-3xl (768px) minus px-6 → ~720px; 800 covers 1x, 1440 covers 2x. */}
        <EditorialImage
          slug={slug!}
          alt={editorialAlt(slug!)}
          widths={[800, 1440]}
          sizes="(min-width: 768px) 720px, 92vw"
          priority
          className="mb-6"
        />
        {eyebrow}
        {heading}
      </header>
    )
  }

  // Fallback: seeded hexagon banner (no photo for this article).
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--border)] px-6 sm:px-10 py-10 sm:py-14 mb-8"
      style={{
        background: `radial-gradient(120% 160% at 12% 0%, color-mix(in oklch, ${color} 12%, transparent), transparent 55%)`,
      }}
    >
      <HexField seed={slug ?? title} color={color} fade />
      <div className="relative">
        {eyebrow}
        {heading}
      </div>
    </div>
  )
}
