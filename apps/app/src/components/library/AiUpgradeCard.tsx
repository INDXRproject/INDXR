"use client"

import { useState } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { Button } from "@indxr/shared/components/ui/button"

// Upsell on a captions transcript (gap 2, akkoord Khidr 2026-11-12): the moment someone reads
// YouTube's captions is when the difference with an AI transcript is visible. The button only
// opens the normal transcribe flow with this video and AI preselected — the user still sees the
// cost block and confirms there, so no credit logic lives here.

interface TranscriptSegment {
  text: string
  offset: number
  duration: number
  speaker?: string
}

interface PreviewResult {
  captionsSegments: TranscriptSegment[]
  aiSegments: TranscriptSegment[]
}

function joinText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ")
}

export function AiUpgradeCard(props: {
  transcriptId: string
  videoId: string
  durationSeconds: number | null
  aiTranscriptId: string | null
  /** profiles.preview_compare_seen — once true, the "Compare the first minute free" link no
   *  longer appears on OTHER captions transcripts (the user already knows the difference). */
  previewCompareSeen: boolean
  /** Set when this exact transcript already has a stored comparison (transcripts.preview_ai_segments)
   *  — stays openable regardless of previewCompareSeen. */
  existingPreview: PreviewResult | null
}) {
  const [preview, setPreview] = useState<PreviewResult | null>(props.existingPreview)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  async function handleCompareClick() {
    posthog.capture("preview_compare_requested", { video_id: props.videoId })
    if (preview) {
      setExpanded(true)
      return
    }
    setLoading(true)
    setPreviewError(null)
    try {
      const res = await fetch(`/api/transcripts/${props.transcriptId}/preview-compare`, { method: "POST" })
      const body = await res.json()
      if (!res.ok) {
        setPreviewError(body?.error || "Could not generate the preview.")
        return
      }
      setPreview({ captionsSegments: body.captions_segments, aiSegments: body.ai_segments })
      setExpanded(true)
      posthog.capture("preview_compare_shown", { video_id: props.videoId })
    } catch {
      setPreviewError("Could not generate the preview.")
    } finally {
      setLoading(false)
    }
  }

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
  // Too short for a meaningful preview, and never offer it once a global comparison has already
  // been seen elsewhere — UNLESS this exact transcript already has one stored (stays openable).
  const canShowPreviewLink = !!preview || (!props.previewCompareSeen && (props.durationSeconds ?? 0) >= 120)

  return (
    <div className="mb-6 border-2 border-border-strong bg-bg-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="text-fg-muted">
          These are YouTube&apos;s captions. An AI transcript adds punctuation, paragraphs and speakers.
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {canShowPreviewLink && (
            <button
              type="button"
              onClick={handleCompareClick}
              disabled={loading}
              className="text-xs font-bold text-fg-strong underline underline-offset-4 hover:text-fg disabled:opacity-50"
            >
              {loading ? "Comparing…" : expanded ? "Hide comparison" : "Compare the first minute free"}
            </button>
          )}
          <Button asChild size="sm">
            <Link
              href={href}
              onClick={() => posthog.capture("library_ai_upgrade_clicked", { credits })}
            >
              {credits ? `Transcribe with AI · ${credits} credit${credits !== 1 ? "s" : ""}` : "Transcribe with AI"}
            </Link>
          </Button>
        </div>
      </div>

      {previewError && <p className="border-t-2 border-border-strong px-4 py-2 text-xs text-error">{previewError}</p>}

      {expanded && preview && (
        <div className="border-t-2 border-border-strong px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">Captions (free)</p>
              <p className="text-sm leading-relaxed text-fg">{joinText(preview.captionsSegments)}</p>
            </div>
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">AI transcript</p>
              <p className="text-sm leading-relaxed text-fg">{joinText(preview.aiSegments)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
