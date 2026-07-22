import type { ReactNode } from "react"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { DocsSidebar } from "./DocsSidebar"
import { DocsMobileNav } from "./DocsMobileNav"
import { InPageTOC } from "./InPageTOC"

interface DocsShellProps {
  children: ReactNode
}

// pt-16 / top-16 clear the fixed marketing header (h-16). The visible breadcrumb lives
// per-page (DocsBreadcrumb, which also emits BreadcrumbList JSON-LD). Three columns on wide
// screens: left nav (lg+), content, right on-this-page TOC (xl+). Mobile opens the nav in a
// drawer (DocsMobileNav).
export function DocsShell({ children }: DocsShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] pt-16">
      {/* Left sidebar — hidden on mobile, visible lg+ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-4 py-5 border-b border-[var(--border)]">
          <a
            href={marketingHref('/docs')}
            className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          >
            Documentation
          </a>
        </div>
        <div className="py-4 flex-1">
          <DocsSidebar />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Mobile nav row — sidebar is hidden below lg; open it in a drawer */}
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 flex items-center justify-between">
          <DocsMobileNav />
          <a
            href={marketingHref('/docs')}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            All docs
          </a>
        </div>

        {/* Content + right on-this-page TOC */}
        <div className="flex gap-10 px-6 py-8">
          {/* max-w-2xl ≈ 42rem ≈ ~70–75ch — the docs reading measure per batch-3b research
              (denser than the old max-w-3xl/~90ch); wide enough that DocsTable (min-w-36rem)
              doesn't scroll on desktop. */}
          <div id="docs-content" className="min-w-0 flex-1 max-w-2xl">
            {children}
          </div>
          <aside className="hidden xl:block w-56 shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <InPageTOC />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
