// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import type { ReactNode } from "react"

interface DefinitionLeadOpeningProps {
  children: ReactNode
}

export function DefinitionLeadOpening({ children }: DefinitionLeadOpeningProps) {
  return (
    <p className="text-base text-[var(--fg-subtle)] leading-relaxed mb-8 max-w-2xl">
      {children}
    </p>
  )
}
