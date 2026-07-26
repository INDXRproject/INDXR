"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "../../lib/utils"
import type { WhisperJobStatus } from "../../lib/eta"
import { TranscriptionProgress } from "../transcription/TranscriptionProgress"
import { ResultCardShell } from "./ResultCardShell"

/**
 * Determinate job-progress card (system.md §4): stages + live elapsed clock inside
 * the shared ResultCardShell so every mode shows an identical "in progress" card
 * (ADR-079). Pure presentation — it renders the already-shared TranscriptionProgress
 * (which owns the stage list + elapsed/ETA row, the live last-update signal) and
 * adds a header. No job/SSE/state knowledge; callers pass the values they already
 * hold.
 */
export function JobProgressCard({
  title,
  status,
  elapsedSeconds,
  audioDurationSeconds,
  note,
  className,
}: {
  title?: string
  status: WhisperJobStatus
  elapsedSeconds: number
  audioDurationSeconds?: number | null
  note?: ReactNode
  className?: string
}) {
  return (
    <ResultCardShell
      className={cn("w-full", className)}
      header={
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
          <p className="truncate text-sm font-semibold text-[var(--fg-strong)]">
            {title?.trim() ? title : "Transcribing…"}
          </p>
        </div>
      }
    >
      <TranscriptionProgress
        status={status}
        elapsedSeconds={elapsedSeconds}
        audioDurationSeconds={audioDurationSeconds}
      />
      {note && <div className="mt-3">{note}</div>}
    </ResultCardShell>
  )
}
