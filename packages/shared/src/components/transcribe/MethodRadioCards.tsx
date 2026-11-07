"use client"

import { cn } from "../../lib/utils"
import { CREDIT_COSTS } from "../../lib/pricing"
import { type TranscribeMethod } from "./method"

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
 * Stijl B (2026-11-06): the selected card is an amber block with a 2px ink border and ink text
 * (was: method-colour tint); unselected cards keep the same 2px border, so no layout shift.
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
      <p className="mb-2 px-0.5 font-mono text-xs uppercase tracking-[0.08em] text-fg">02 — Method</p>
      <div
        role="radiogroup"
        aria-label="Transcription method"
        onKeyDown={onKeyDown}
        className="flex flex-col sm:flex-row gap-0"
      >
        {ORDER.map((m) => {
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
                "flex flex-1 items-start gap-2.5 p-3 text-left min-h-[44px] cursor-pointer transition-colors",
                "border-2 border-border-strong -mt-[2px] sm:mt-0 sm:-ml-[2px] first:mt-0 first:ml-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                selected
                  ? "bg-accent"
                  : "bg-bg hover:bg-bg-subtle",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  "border-border-strong"
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-fg-on-accent" />}
              </span>

              {m === "captions" ? (
                <span className="min-w-0">
                  <span className={cn("flex items-center gap-1.5 font-medium", selected ? "text-fg-on-accent font-bold" : "text-fg-strong")}>
                    YouTube captions
                    <span className="border border-current px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide">
                      Free
                    </span>
                  </span>
                  <span className={cn("mt-0.5 block text-xs", selected ? "text-fg-on-accent" : "text-fg-muted")}>
                    Existing captions from YouTube
                  </span>
                </span>
              ) : (
                <span className="min-w-0">
                  <span className={cn("font-medium", selected ? "text-fg-on-accent font-bold" : "text-fg-strong")}>AI transcription</span>
                  <span className={cn("mt-0.5 block text-xs", selected ? "text-fg-on-accent" : "text-fg-muted")}>
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
