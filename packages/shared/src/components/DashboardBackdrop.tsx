import type { ReactNode } from "react"


/**
 * Stijl B (2026-11-06): the honeycomb texture is gone; the wrapper keeps the min-h-full chain so
 * pages that fill the viewport keep their layout. (Was: per-page honeycomb backdrop — the explicit opt-in that replaces the blanket wash
 * the dashboard layout used to paint behind every page (ADR-079). system.md §5
 * allows the pattern on empty states / marketing / auth / 404 / footer, not on
 * working dashboard pages, so each page now decides for itself by rendering (or not
 * rendering) this wrapper. There is deliberately no pathname check in the layout —
 * that silently goes wrong at the next page.
 *
 * It reproduces the old layout's layering exactly: a positioned container, the
 * absolute pattern at the same opacity, and the content raised above it. Library is
 * the one working page that keeps it (documented exception, LESSONS 2026-07-03).
 */
export function DashboardBackdrop({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  // Both layers carry min-h-full so a page that fills the viewport (e.g. Library) keeps its
  // full-height chain and the texture reaches the bottom exactly as the old layout wash did.
  return (
    <div className={`relative min-h-full ${className ?? ""}`}>
      <div className="relative min-h-full">{children}</div>
    </div>
  )
}
