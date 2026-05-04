// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import type { ReactNode } from "react"

interface EdgeCasesCalloutProps {
  children: ReactNode
  title?: string
}

export function EdgeCasesCallout({ children, title = "Edge cases" }: EdgeCasesCalloutProps) {
  return (
    <div className="my-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">{title}</p>
      <div className="text-sm text-[var(--fg-muted)] space-y-2">{children}</div>
    </div>
  )
}
