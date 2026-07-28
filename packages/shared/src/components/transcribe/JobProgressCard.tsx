"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "../../lib/utils"
import type { WhisperJobStatus } from "../../lib/eta"
import { TranscriptionProgress } from "../transcription/TranscriptionProgress"
import { ResultCardShell } from "./ResultCardShell"

// The header names the phase that's actually happening — not a fixed "Transcribing…" that lied
// during the download (point 4). The video title, when known, sits under it as quiet context.
const STATUS_LABEL: Record<WhisperJobStatus, string> = {
  pending: 'Queued',
  downloading: 'Downloading audio',
  transcribing: 'Transcribing',
  saving: 'Saving to your library',
}

/**
 * Job-progress card (system.md §4) inside the shared ResultCardShell so every mode shows an
 * identical "in progress" card (ADR-079). Pure presentation — renders TranscriptionProgress (the
 * sub-line, bar, phase strip, elapsed/ETA) under a phase-driven header. No job/SSE/state knowledge;
 * callers pass the values they already hold, including live download bytes when the backend has
 * them (point 5).
 */
export function JobProgressCard({
  title,
  status,
  elapsedSeconds,
  audioDurationSeconds,
  downloadedBytes,
  totalBytes,
  note,
  className,
}: {
  title?: string
  status: WhisperJobStatus
  elapsedSeconds: number
  audioDurationSeconds?: number | null
  downloadedBytes?: number | null
  totalBytes?: number | null
  note?: ReactNode
  className?: string
}) {
  return (
    <ResultCardShell
      className={cn("w-full", className)}
      header={
        <div className="flex items-start gap-2 min-w-0">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--fg-strong)]">{STATUS_LABEL[status]}</p>
            {title?.trim() && (
              <p className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">{title}</p>
            )}
          </div>
        </div>
      }
    >
      <TranscriptionProgress
        status={status}
        elapsedSeconds={elapsedSeconds}
        audioDurationSeconds={audioDurationSeconds}
        downloadedBytes={downloadedBytes}
        totalBytes={totalBytes}
      />
      {note && <div className="mt-3">{note}</div>}
    </ResultCardShell>
  )
}
