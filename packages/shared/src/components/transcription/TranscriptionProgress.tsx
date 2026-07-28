"use client"

import { cn } from "../../lib/utils"
import { calcEta, formatElapsed, type WhisperJobStatus } from "../../lib/eta"

// The pipeline order. The header (JobProgressCard) names the active phase; here we render the
// sub-line, the bar, the thin phase strip and the elapsed/ETA row. No numbered wizard — that read
// like a form (point 4). The bar is determinate ONLY for a real download percentage; everything
// else is indeterminate, never a guessed number (point 5).
const STEPS: WhisperJobStatus[] = ['pending', 'downloading', 'transcribing', 'saving']

const SUBLABEL: Record<WhisperJobStatus, string> = {
  pending: 'Waiting for a free worker',
  downloading: 'Fetching audio from YouTube',
  transcribing: 'AI is processing the audio',
  saving: 'Writing the transcript to your library',
}

const fmtMB = (bytes: number) => (bytes / 1_048_576).toFixed(1)

interface TranscriptionProgressProps {
  status: WhisperJobStatus
  elapsedSeconds: number
  audioDurationSeconds?: number | null
  /** Live download bytes (point 5). Determinate bar shows only when both are present and total > 0;
      until the backend writes these columns, the download shows the indeterminate bar. */
  downloadedBytes?: number | null
  totalBytes?: number | null
  className?: string
}

export function TranscriptionProgress({
  status,
  elapsedSeconds,
  audioDurationSeconds,
  downloadedBytes,
  totalBytes,
  className,
}: TranscriptionProgressProps) {
  const currentIndex = STEPS.indexOf(status)
  const { label: etaLabel } = calcEta(audioDurationSeconds ?? null, elapsedSeconds, status)

  const hasBytes =
    status === 'downloading' && downloadedBytes != null && totalBytes != null && totalBytes > 0
  const pct = hasBytes ? Math.min(100, Math.round((downloadedBytes! / totalBytes!) * 100)) : 0

  // Right-hand context on the sub-line: real bytes while downloading, audio length while
  // transcribing (AssemblyAI gives no percentage, so length is the honest context — not a bar).
  const context = hasBytes
    ? `${fmtMB(downloadedBytes!)} / ${fmtMB(totalBytes!)} MB`
    : status === 'transcribing' && audioDurationSeconds
      ? `~${Math.round(audioDurationSeconds / 60)} min of audio`
      : null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs text-fg-muted">
        <span className="min-w-0">{SUBLABEL[status]}</span>
        {context && <span className="shrink-0 font-mono tabular-nums">{context}</span>}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        {hasBytes ? (
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-full rounded-full bg-accent/60 motion-safe:animate-pulse" />
        )}
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-[3px] flex-1 rounded-full",
              i < currentIndex ? "bg-success" : i === currentIndex ? "bg-accent" : "bg-surface-sunken",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between font-mono text-xs text-fg-muted tabular-nums">
        <span>{formatElapsed(elapsedSeconds)}</span>
        {etaLabel && <span>{etaLabel}</span>}
      </div>
    </div>
  )
}
