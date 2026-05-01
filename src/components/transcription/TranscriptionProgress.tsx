"use client"

import { Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { calcEta, formatElapsed, type WhisperJobStatus } from "@/lib/eta"

const STEPS: { status: WhisperJobStatus; label: string; sublabel: string }[] = [
  { status: 'pending',     label: 'Queued',        sublabel: 'Waiting for a worker' },
  { status: 'downloading', label: 'Downloading',   sublabel: 'Fetching audio from server' },
  { status: 'transcribing',label: 'Transcribing',  sublabel: 'AI is processing the audio' },
  { status: 'saving',      label: 'Saving',        sublabel: 'Writing transcript to library' },
]

const STATUS_ORDER: WhisperJobStatus[] = ['pending', 'downloading', 'transcribing', 'saving']

interface TranscriptionProgressProps {
  status: WhisperJobStatus
  elapsedSeconds: number
  audioDurationSeconds?: number | null
  className?: string
}

export function TranscriptionProgress({
  status,
  elapsedSeconds,
  audioDurationSeconds,
  className,
}: TranscriptionProgressProps) {
  const currentIndex = STATUS_ORDER.indexOf(status)
  const { label: etaLabel } = calcEta(audioDurationSeconds ?? null, elapsedSeconds, status)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Steps */}
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex
          const isActive = i === currentIndex
          return (
            <li key={step.status} className="flex items-center gap-3">
              {/* Circle indicator */}
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isDone  && "border-green-500 bg-green-500 text-white",
                  isActive && "border-accent bg-accent/10 text-accent",
                  !isDone && !isActive && "border-border bg-surface text-fg-muted",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-medium leading-none",
                  isActive ? "text-fg" : isDone ? "text-fg-muted" : "text-fg-muted/50",
                )}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-fg-muted">{step.sublabel}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Elapsed + ETA row */}
      <div className="flex items-center justify-between text-xs text-fg-muted font-mono">
        <span>{formatElapsed(elapsedSeconds)}</span>
        {etaLabel && <span>{etaLabel}</span>}
      </div>
    </div>
  )
}
