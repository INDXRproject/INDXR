// Article header (stijl B). Editorial photo, when present, is the LCP element (priority, 800/1440).
import { EditorialImage } from "./EditorialImage"
import { editorialAlt, hasEditorialImage } from "@/lib/editorialAlts"

export type ArticleCategory = "Troubleshooting" | "Export Formats" | "Workflows" | "Deep Dives" | "Reference"

// Display eyebrow per category (the union keys stay as stable internal identifiers; only the
// shown label changed — Formats, AI & RAG). No per-category colour any more.
const CATEGORY_EYEBROW: Record<ArticleCategory, string> = {
  "Troubleshooting": "Troubleshooting",
  "Export Formats": "Formats",
  "Workflows": "Workflows",
  "Deep Dives": "AI & RAG",
  "Reference": "Reference",
}

export function ArticleHero({
  title,
  category,
  slug,
  readingMinutes,
}: {
  title: string
  category?: ArticleCategory
  slug?: string
  readingMinutes?: number
}) {
  // Stijl B (2026-11-06): mono label "Category · N min read" + big title; the editorial photo (when
  // there is one) sits below as a ruled 21:9 band. No hexagon fallback any more.
  const eyebrowLabel = (category && CATEGORY_EYEBROW[category]) ?? "Article"
  return (
    <header className="mb-6">
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">
        {eyebrowLabel}
        {readingMinutes ? ` · ${readingMinutes} min read` : ""}
      </p>
      <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.04em] text-[var(--fg-strong)] sm:text-6xl">
        {title}
      </h1>
      {hasEditorialImage(slug) && (
        <div className="mt-8 max-w-4xl border-2 border-[var(--fg-strong)]">
          {/* 21:9 band; column is ~900px so 800/1440 cover 1x/2x. */}
          <EditorialImage
            slug={slug!}
            alt={editorialAlt(slug!)}
            widths={[800, 1440]}
            sizes="(min-width: 1024px) 900px, 92vw"
            aspectClass="aspect-[21/9]"
            priority
            rounded="rounded-none"
            bordered={false}
          />
        </div>
      )}
    </header>
  )
}
