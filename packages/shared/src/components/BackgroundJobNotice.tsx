"use client"

import { Info } from "lucide-react"
import { cn } from "../lib/utils"

interface BackgroundJobNoticeProps {
  /** When true, adds a soft advisory that large playlists take longer. */
  largePlaylist?: boolean
  className?: string
}

/**
 * Persistent inline reassurance shown while a background job (playlist or a
 * long AI transcription) is running. Tells the user the work continues
 * server-side after they leave, and that a started job cannot be cancelled.
 */
export function BackgroundJobNotice({ largePlaylist, className }: BackgroundJobNoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-surface-elevated/50 p-3 text-sm text-fg-muted",
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
      <div className="space-y-1 leading-snug">
        <p>
          This runs in the background — it&apos;s safe to close this tab or log out. Processing
          continues on our servers and finished transcripts appear in your Library.
        </p>
        <p>
          Once started, a job can&apos;t be cancelled.
          {largePlaylist ? " Large playlists can take a while to finish." : ""}
        </p>
      </div>
    </div>
  )
}
