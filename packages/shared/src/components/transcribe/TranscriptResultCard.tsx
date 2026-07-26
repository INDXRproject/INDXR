import type { ReactNode } from "react"
import { CheckCircle, Info } from "lucide-react"

import { cn } from "../../lib/utils"
import { ResultCardShell } from "./ResultCardShell"

/**
 * Result card for a finished single transcript (video / audio), on the shared
 * ResultCardShell so it reads identically to the job-progress card it replaces in
 * the same slot and to the playlist batch completion (which also renders inside
 * ResultCardShell) — ADR-079. Pure presentation; the caller passes the already
 * computed headline/meta and any credit-receipt body as children.
 */
export function TranscriptResultCard({
  headline,
  meta,
  libraryHref,
  tone = "success",
  children,
  className,
}: {
  headline: string
  meta?: ReactNode
  libraryHref?: string
  tone?: "success" | "error"
  children?: ReactNode
  className?: string
}) {
  const isError = tone === "error"
  return (
    <ResultCardShell
      tone={tone}
      className={className}
      header={
        <div className="flex items-start gap-2 min-w-0">
          {isError ? (
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-[var(--fg-muted)]" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--success)]" />
          )}
          <div className="min-w-0">
            <p className={cn("font-semibold text-sm", isError ? "text-[var(--fg)]" : "text-[var(--success-fg)] dark:text-[var(--success)]")}>
              {headline}
            </p>
            {meta && <p className="mt-0.5 text-xs text-[var(--fg-muted)] tabular-nums">{meta}</p>}
          </div>
        </div>
      }
      actions={
        libraryHref && !isError ? (
          <a
            href={libraryHref}
            className="rounded-lg border border-[var(--success)]/40 px-2.5 py-1 text-xs font-medium text-[var(--success-fg)] dark:text-[var(--success)] hover:bg-[var(--success-subtle)] transition-colors"
          >
            View in Library
          </a>
        ) : undefined
      }
    >
      {children}
    </ResultCardShell>
  )
}
