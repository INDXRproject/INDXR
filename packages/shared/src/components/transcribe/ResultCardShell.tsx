import type { ReactNode } from "react"

import { cn } from "../../lib/utils"
import { NOTICE_BAR } from "../../lib/notice"

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
  // Stijl B: ink frame on white paper; success/error add the tone bar on the left (lib/notice.ts).
  const toneClass =
    tone === "success"
      ? NOTICE_BAR.success
      : tone === "error"
        ? NOTICE_BAR.error
        : ""

  return (
    <div
      className={cn(
        "border-2 border-border-strong bg-bg px-4 py-4 text-left text-fg animate-in fade-in slide-in-from-top-2 duration-300",
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
