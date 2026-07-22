import type { ReactNode } from "react"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { DocsSidebar } from "./DocsSidebar"

interface DocsShellProps {
  children: ReactNode
}

// pt-16 / top-16 clear the fixed marketing header (h-16). Without this offset the
// transparent fixed header overlapped the sidebar title and the breadcrumb. The visible
// breadcrumb lives per-page (DocsBreadcrumb, which also emits BreadcrumbList JSON-LD) —
// the shell no longer renders a second one.
export function DocsShell({ children }: DocsShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] pt-16">
      {/* Left sidebar — hidden on mobile, visible lg+ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-4 py-5 border-b border-[var(--border)] flex items-center justify-between gap-2">
          <a
            href={marketingHref('/docs')}
            className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          >
            Documentation
          </a>
          <a
            href={marketingHref('/articles')}
            className="text-xs text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
          >
            Articles →
          </a>
        </div>
        <div className="py-4 flex-1">
          <DocsSidebar />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Mobile nav row — sidebar is hidden below lg */}
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 flex items-center justify-between">
          <a
            href={marketingHref('/docs')}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            ← All docs
          </a>
          <a
            href={marketingHref('/articles')}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Articles →
          </a>
        </div>

        {/* Page content */}
        <main className="px-6 py-8 max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  )
}
