// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"
import type { DocsSection, DocsPage } from "@/lib/docs-config"

interface DocsCategorySectionProps {
  section: DocsSection
  intro?: string
}

// Attach each indented page (indent > 0) to the preceding top-level page as a child, so the six
// export formats fall under the "Export formats" row as a compact inline strip instead of six
// full-width rows that make Reference disproportionately long.
function groupPages(pages: DocsPage[]): { page: DocsPage; children: DocsPage[] }[] {
  const groups: { page: DocsPage; children: DocsPage[] }[] = []
  for (const page of pages) {
    if ((page.indent ?? 0) > 0 && groups.length > 0) {
      groups[groups.length - 1].children.push(page)
    } else {
      groups.push({ page, children: [] })
    }
  }
  return groups
}

export function DocsCategorySection({ section, intro }: DocsCategorySectionProps) {
  const groups = groupPages(section.pages)
  return (
    <div className="mb-8 break-inside-avoid">
      <h2 className="text-base font-semibold text-[var(--fg)] mb-1">{section.label}</h2>
      {intro && <p className="text-sm text-[var(--fg-muted)] mb-3">{intro}</p>}
      <ul className="space-y-2.5">
        {groups.map(({ page, children }) => (
          <li key={page.href}>
            <Link href={page.href} className="group block">
              <span className="text-sm font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                {page.label}
              </span>
              {page.description && (
                <span className="block text-sm text-[var(--fg-muted)]">{page.description}</span>
              )}
            </Link>
            {children.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="text-xs text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
