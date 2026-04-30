"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { DocsSidebar } from "./DocsSidebar"
import { findPageInDocs } from "@/lib/docs-config"

interface DocsShellProps {
  children: ReactNode
}

export function DocsShell({ children }: DocsShellProps) {
  const pathname = usePathname()
  const match = findPageInDocs(pathname)

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Left sidebar — hidden on mobile, visible lg+ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-5 border-b border-[var(--border)]">
          <Link
            href="/docs"
            className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          >
            Documentation
          </Link>
        </div>
        <div className="py-4 flex-1">
          <DocsSidebar />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        {match && (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[var(--fg-muted)]">
              <Link href="/docs" className="hover:text-[var(--fg)] transition-colors">
                Docs
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-[var(--fg-subtle)]">{match.section.label}</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-[var(--fg)] font-medium">{match.page.label}</span>
            </nav>
          </div>
        )}

        {/* Mobile nav hint */}
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
          <Link
            href="/docs"
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            ← All docs
          </Link>
        </div>

        {/* Page content */}
        <main className="px-6 py-8 max-w-3xl">
          {children}
        </main>

        {/* Related articles placeholder */}
        {/* TODO: relatedArticles per page — voeg relatedArticles veld toe aan DocsPage in docs-config.ts */}
      </div>

      {/* Right rail placeholder — table of contents */}
      {/* TODO: table of contents placeholder — parse headings from content */}
    </div>
  )
}
