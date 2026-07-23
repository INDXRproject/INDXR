// Article header. When the article has an editorial photo it shows a full-width 21:9 band
// (srcset 800/1440, high priority as the LCP element) with the category eyebrow + title below
// — so the photo carried on the /articles card is also shown on the article itself. The band
// is 21:9 (not 16:9) so it reads as a strip and doesn't push the title far down; it stays
// within the article column (never full-bleed — our mid-tone sand images would dominate as a
// full-width band). When no photo exists the header falls back to the seeded hexagon field.
// Categories carry no colour of their own: the eyebrow is always the brand accent.
import { EditorialImage } from "./EditorialImage"
import { HexField } from "./HexField"
import { editorialAlt, hasEditorialImage } from "@/lib/editorialAlts"

export type ArticleCategory = "Troubleshooting" | "Export Formats" | "Workflows" | "Deep Dives"

// Display eyebrow per category (the union keys stay as stable internal identifiers; only the
// shown label changed — Formats, AI & RAG). No per-category colour any more.
const CATEGORY_EYEBROW: Record<ArticleCategory, string> = {
  "Troubleshooting": "Troubleshooting",
  "Export Formats": "Formats",
  "Workflows": "Workflows",
  "Deep Dives": "AI & RAG",
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
  const eyebrowLabel = (category && CATEGORY_EYEBROW[category]) ?? "Article"
  const eyebrow = (
    <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
      {eyebrowLabel}
    </span>
  )
  const heading = (
    <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fg)]">{title}</h1>
  )

  if (hasEditorialImage(slug)) {
    return (
      <header className="mb-8">
        {/* 21:9 band; article column is ~720px so 800 covers 1x, 1440 covers 2x. */}
        <EditorialImage
          slug={slug!}
          alt={editorialAlt(slug!)}
          widths={[800, 1440]}
          sizes="(min-width: 768px) 720px, 92vw"
          aspectClass="aspect-[21/9]"
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
        background:
          "radial-gradient(120% 160% at 12% 0%, color-mix(in oklch, var(--accent) 12%, transparent), transparent 55%)",
      }}
    >
      <HexField seed={slug ?? title} color="var(--accent)" fade />
      <div className="relative">
        {eyebrow}
        {heading}
      </div>
    </div>
  )
}
