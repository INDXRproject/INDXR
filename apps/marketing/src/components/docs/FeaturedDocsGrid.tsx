// The four featured cards on the /docs hub. Only the SELECTION of which pages to feature
// lives here; the label + description are read from docs-config.ts, so each page has one
// description (no separately-typed copy that can drift).

import Link from "next/link"
import { findPageInDocs } from "@/lib/docs-config"

const FEATURED_HREFS = [
  "/docs/quickstart",
  "/docs/how-indxr-works",
  "/docs/account/credits",
  "/docs/reference/export-formats",
]

export function FeaturedDocsGrid() {
  const featured = FEATURED_HREFS.map((href) => findPageInDocs(href)?.page).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  )

  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-12">
      {featured.map((doc) => (
        <Link
          key={doc.href}
          href={doc.href}
          className="block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)] transition-colors"
        >
          <p className="font-semibold text-[var(--fg)] mb-1">{doc.label}</p>
          <p className="text-sm text-[var(--fg-muted)]">{doc.description}</p>
        </Link>
      ))}
    </div>
  )
}
