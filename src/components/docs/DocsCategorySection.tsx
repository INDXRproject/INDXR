// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"
import type { DocsSection } from "@/lib/docs-config"

interface DocsCategorySectionProps {
  section: DocsSection
  intro?: string
}

export function DocsCategorySection({ section, intro }: DocsCategorySectionProps) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-[var(--fg)] mb-1">{section.label}</h2>
      {intro && <p className="text-sm text-[var(--fg-muted)] mb-3">{intro}</p>}
      <ul className="space-y-1.5">
        {section.pages.map((page) => (
          <li key={page.href} style={{ paddingLeft: `${(page.indent ?? 0) * 16}px` }}>
            <Link
              href={page.href}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
