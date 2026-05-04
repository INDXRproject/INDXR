// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import type { ReactNode } from "react"

interface WhatJustHappenedProps {
  children: ReactNode
}

export function WhatJustHappened({ children }: WhatJustHappenedProps) {
  return (
    <div className="my-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">What just happened</p>
      <p className="text-sm text-[var(--fg-muted)]">{children}</p>
    </div>
  )
}
