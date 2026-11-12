"use client"

import Link from "next/link"
import posthog from "posthog-js"
import { Button } from "@indxr/shared/components/ui/button"

// Upsell on a captions transcript (gap 2, akkoord Khidr 2026-11-12): the moment someone reads
// YouTube's captions is when the difference with an AI transcript is visible. The button only
// opens the normal transcribe flow with this video and AI preselected — the user still sees the
// cost block and confirms there, so no credit logic lives here.
export function AiUpgradeCard(props: {
  videoId: string
  durationSeconds: number | null
  aiTranscriptId: string | null
}) {
  if (props.aiTranscriptId) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-border-strong bg-bg-subtle px-4 py-3 text-sm">
        <span className="text-fg-muted">You also have an AI transcript of this video.</span>
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/library/${props.aiTranscriptId}`}>Open AI transcript</Link>
        </Button>
      </div>
    )
  }

  const credits = props.durationSeconds ? Math.max(1, Math.ceil(props.durationSeconds / 60)) : null
  const videoUrl = `https://www.youtube.com/watch?v=${props.videoId}`
  const href = `/dashboard/transcribe?mode=video&video=${encodeURIComponent(videoUrl)}&method=ai`

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-border-strong bg-bg-subtle px-4 py-3 text-sm">
      <span className="text-fg-muted">
        These are YouTube&apos;s captions. An AI transcript adds punctuation, paragraphs and speakers.
      </span>
      <Button asChild size="sm">
        <Link
          href={href}
          onClick={() => posthog.capture("library_ai_upgrade_clicked", { credits })}
        >
          {credits ? `Transcribe with AI · ${credits} credit${credits !== 1 ? "s" : ""}` : "Transcribe with AI"}
        </Link>
      </Button>
    </div>
  )
}
