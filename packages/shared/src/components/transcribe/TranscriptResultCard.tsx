import type { ReactNode } from "react"
import { CheckCircle, Info } from "lucide-react"

import { cn } from "../../lib/utils"
import { NOTICE_ICON, NOTICE_TITLE } from "../../lib/notice"
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
            <Info className={cn("h-4 w-4 shrink-0 mt-0.5", NOTICE_ICON.error)} />
          ) : (
            <CheckCircle className={cn("h-4 w-4 shrink-0 mt-0.5", NOTICE_ICON.success)} />
          )}
          <div className="min-w-0">
            <p className={cn("text-sm", NOTICE_TITLE)}>
              {headline}
            </p>
            {meta && <p className="mt-0.5 text-xs text-fg tabular-nums">{meta}</p>}
          </div>
        </div>
      }
      actions={
        libraryHref && !isError ? (
          <a
            href={libraryHref}
            className="inline-flex items-center border-2 border-border-strong bg-bg px-2.5 py-1 text-xs font-bold text-fg-strong hover:bg-bg-subtle transition-colors"
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
