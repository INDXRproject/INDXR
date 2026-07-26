"use client"

import { cn } from "../../lib/utils"
import { CREDIT_COSTS } from "../../lib/pricing"

/**
 * Source choice — the two-cell segmented control in the video-mode footer that
 * replaces the old "Generate with AI" toggle (ADR-079). Same visual language as
 * the ModeStrip but smaller and icon-less: a --surface-sunken track with two
 * raised-on-active cells. No amber — the single amber element per card is the
 * action button.
 *
 * "captions" = free auto-captions, "ai" = AssemblyAI transcription. The cost is
 * read from pricing.ts, never hardcoded. Each cell stacks a label over a small
 * sub-line, so the tap target clears the 44px floor even though it reads smaller
 * than the mode strip.
 */

export type TranscribeSource = "captions" | "ai"

export function SourceChoice({
  value,
  onChange,
  className,
}: {
  value: TranscribeSource
  onChange: (next: TranscribeSource) => void
  className?: string
}) {
  const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

  const cellClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-start justify-center gap-0.5 rounded-md min-h-[44px] px-3 py-1.5",
      "border border-transparent text-left cursor-pointer transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
      active
        ? "bg-[var(--surface)] border-[var(--border)] shadow-xs"
        : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
    )

  return (
    <div
      role="radiogroup"
      aria-label="Transcript source"
      className={cn("flex w-full items-stretch gap-1 rounded-lg bg-[var(--surface-sunken)] p-1", className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "captions"}
        onClick={() => onChange("captions")}
        className={cellClass(value === "captions")}
      >
        <span className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", value === "captions" ? "text-[var(--fg-strong)]" : "")}>
            Auto-captions
          </span>
          <span className="rounded-sm bg-[var(--success-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--success)]">
            Free
          </span>
        </span>
        <span className="text-xs text-[var(--fg-muted)]">Existing captions</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={value === "ai"}
        onClick={() => onChange("ai")}
        className={cellClass(value === "ai")}
      >
        <span className={cn("text-sm font-medium", value === "ai" ? "text-[var(--fg-strong)]" : "")}>
          AI transcription
        </span>
        <span className="text-xs text-[var(--fg-muted)]">
          {perMin} credit{perMin === 1 ? "" : "s"}/min
        </span>
      </button>
    </div>
  )
}
