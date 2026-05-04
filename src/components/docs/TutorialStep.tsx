// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import type { ReactNode } from "react"

interface TutorialStepProps {
  step: number
  heading: string
  children: ReactNode
  verification?: string
}

export function TutorialStep({ step, heading, children, verification }: TutorialStepProps) {
  return (
    <div className="mb-8">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--fg-on-accent)] text-sm font-bold flex items-center justify-center">
          {step}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--fg)] mb-2">{heading}</h2>
          <div className="text-sm text-[var(--fg-muted)] space-y-3">{children}</div>
          {/* Screenshot slot */}
          <div className="mt-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface-sunken)] h-32 flex items-center justify-center text-xs text-[var(--fg-muted)]">
            Screenshot placeholder
          </div>
          {verification && (
            <p className="mt-3 text-sm text-[var(--fg-muted)] bg-[var(--surface)] rounded-[var(--radius-sm)] px-3 py-2 border border-[var(--border)]">
              <span className="font-medium">You should see:</span> {verification}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
