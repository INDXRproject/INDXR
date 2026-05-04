// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import type { ReactNode } from "react"

interface TutorialOpeningProps {
  children: ReactNode
  timeEstimate?: string
}

export function TutorialOpening({ children, timeEstimate }: TutorialOpeningProps) {
  return (
    <div className="mb-8">
      {timeEstimate && (
        <p className="text-xs font-medium text-[var(--fg-muted)] mb-2">⏱ {timeEstimate}</p>
      )}
      <p className="text-base text-[var(--fg-subtle)] leading-relaxed">{children}</p>
    </div>
  )
}
