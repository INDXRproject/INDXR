import type { ReactNode } from "react"

import { cn } from "../../lib/utils"

/**
 * Result card chrome — the one wrapper every below-the-form state renders inside
 * (job progress, single-transcript result, playlist batch completion) so all three
 * modes share identical chrome (ADR-079). Pure presentation: border, radius,
 * padding, an optional header row (left slot + right action slot), children. No
 * state, no content of its own.
 */
export function ResultCardShell({
  tone = "default",
  header,
  actions,
  className,
  children,
}: {
  tone?: "default" | "success" | "error"
  header?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  const toneClass =
    tone === "success"
      ? "border-[var(--success)]/30 bg-[var(--success-subtle)]"
      : tone === "error"
        ? "border-[var(--border)] bg-[var(--surface-elevated)]"
        : "border-[var(--border)] bg-[var(--surface)]"

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4 text-left animate-in fade-in slide-in-from-top-2 duration-300",
        toneClass,
        className
      )}
    >
      {(header || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">{header}</div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
