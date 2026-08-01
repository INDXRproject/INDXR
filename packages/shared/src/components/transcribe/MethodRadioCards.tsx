"use client"

import { cn } from "../../lib/utils"
import { CREDIT_COSTS } from "../../lib/pricing"
import { METHOD_META, type TranscribeMethod } from "./method"

/**
 * Transcription-method chooser as a real radio group (ADR-080) — NOT a segmented
 * control. A segmented control has the same shape as the mode strip above it, so two
 * of them stack up as "two rows of tabs" and the choice is invisible. Two radio
 * cards side by side (stacked under sm), each with a visible radio indicator, title
 * and one sub-line. The selected card gets the method colour as a background tint
 * plus a 1.5px border in the same colour; both cards keep a 1.5px border so the
 * selection causes no layout shift. No shared track — that shape belongs to the mode
 * strip alone.
 *
 * Note: the brief's "--fg-secondary" maps to the existing --fg-subtle token (more
 * prominent than --fg-muted); there is no --fg-secondary in tokens.css.
 */
const ORDER: TranscribeMethod[] = ["captions", "ai"]

export function MethodRadioCards({
  value,
  onChange,
  availableCredits,
  disabled,
  className,
}: {
  value: TranscribeMethod
  onChange: (m: TranscribeMethod) => void
  availableCredits?: number | null
  disabled?: boolean
  className?: string
}) {
  const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault()
      onChange(value === "captions" ? "ai" : "captions")
    }
  }

  return (
    <div className={className}>
      <p className="mb-2 px-0.5 text-xs text-fg-subtle">Transcription method</p>
      <div
        role="radiogroup"
        aria-label="Transcription method"
        onKeyDown={onKeyDown}
        className="flex flex-col sm:flex-row gap-2.5"
      >
        {ORDER.map((m) => {
          const meta = METHOD_META[m]
          const selected = value === m
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => !disabled && onChange(m)}
              className={cn(
                "flex flex-1 items-start gap-2.5 rounded-lg p-3 text-left min-h-[44px] cursor-pointer transition-colors",
                "border-[1.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                selected
                  ? cn(meta.tint, meta.border)
                  : "bg-surface border-border hover:border-border-strong",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  selected ? meta.border : "border-border-strong"
                )}
              >
                {selected && <span className={cn("h-2 w-2 rounded-full", meta.indicator)} />}
              </span>

              {m === "captions" ? (
                <span className="min-w-0">
                  <span className={cn("flex items-center gap-1.5 font-medium", selected ? "text-sky" : "text-fg")}>
                    YouTube captions
                    <span className="rounded-sm bg-success-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                      Free
                    </span>
                  </span>
                  <span className={cn("mt-0.5 block text-xs", selected ? "text-sky" : "text-fg-muted")}>
                    Existing captions from YouTube
                  </span>
                </span>
              ) : (
                <span className="min-w-0">
                  <span className={cn("font-medium", selected ? "text-indigo" : "text-fg")}>AI transcription</span>
                  <span className={cn("mt-0.5 block text-xs", selected ? "text-indigo" : "text-fg-muted")}>
                    {perMin} credit per minute
                    {availableCredits != null ? ` · ${availableCredits} available` : ""}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
