'use client'
import { useState } from "react"
import { CheckCircle, Info, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

// ── Completion receipt (ADR-050 fase 3) ─────────────────────────────────────────
// One honest receipt for every job type. Principle: "silence on success, explain on
// deviation." Purely presentational — all numbers come pre-assembled from
// useCompletionReceipt (read-only RLS reads of the refund-row metadata + settlement
// rows). Never derives money; never parses the refund reason string.
//
//  State A (clean, most jobs): one line — what was charged. No reserve/refund noise.
//  State B (refund present):   "charged N · X transcribed · Y skipped — Z not used, refunded"
//                              + an expandable per-video breakdown (playlist).
//  State C (upload overshoot): State-A receipt + a reassurance strip. ONLY when an
//                              upload reserved more than it used because the ffprobe
//                              estimate was high (kind='upload' && reserved > used) —
//                              NOT for playlist-failure refunds.
//  Failed:                     "Not charged" + any reserved credits refunded.
//
// `embedded` renders without card chrome or its own header (used inside the playlist
// Final Summary View, which already has a header) — just the credit content.

// Copy lives here so wording is tuned in one place. Refund voice = "not used — refunded".
const REFUND_TAIL = "not used — refunded to your balance"
const overshootCopy = (reserved: number, used: number, back: number) =>
  `You only pay for what you use — we reserved ${reserved}, used ${used}. ${back} ${plural(back, "credit")} ${REFUND_TAIL}.`

function plural(n: number, word: string) { return `${word}${n === 1 ? "" : "s"}` }
function fmtMin(seconds?: number | null) { return seconds && seconds > 0 ? `${Math.round(seconds / 60)} min` : null }
function fmtElapsed(seconds?: number | null) {
  if (seconds == null || seconds < 0) return null
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export type ReceiptVideo = {
  videoId: string
  title?: string
  state: "charged" | "free" | "skipped"
  credits?: number
  errorType?: string
}

export interface CompletionReceiptProps {
  kind: "video" | "upload" | "playlist"
  status: "complete" | "error"
  headline: string
  used: number
  reserved?: number | null
  refunded?: number | null
  durationSeconds?: number | null
  elapsedSeconds?: number | null
  transcribedCount?: number | null
  skippedCount?: number | null
  videos?: ReceiptVideo[]
  libraryHref?: string
  loading?: boolean
  embedded?: boolean
  className?: string
}

const SKIP_LABEL: Record<string, string> = {
  members_only: "Members-only — not charged",
  age_restricted: "Age-restricted — not charged",
}

export function CompletionReceipt({
  kind, status, headline, used, reserved, refunded, durationSeconds, elapsedSeconds,
  transcribedCount, skippedCount, videos, libraryHref, embedded, className,
}: CompletionReceiptProps) {
  const [open, setOpen] = useState(false)

  const back = Math.max(0, refunded ?? 0)                 // credits that came back (ignore negative = paid more)
  const isError = status === "error"
  const hasRefund = back > 0
  // Overshoot strip is UPLOAD-ONLY and means "we estimated the length too high", not
  // "something failed". A single completed upload with reserved > used can only be an
  // over-estimate (no per-video failures possible), so reserved > used is the signal.
  const isOvershoot = kind === "upload" && status === "complete" && reserved != null && reserved > used
  const hasBreakdown = kind === "playlist" && !!videos && videos.length > 0
  const showRefundLine = hasRefund && !isOvershoot            // overshoot tells the story in its strip instead

  const metaBits = [
    `${used} ${plural(used, "credit")}`,
    fmtMin(durationSeconds),
    fmtElapsed(elapsedSeconds),
  ].filter(Boolean)

  // The one credit line, adapting to clean vs refund.
  const creditLine = showRefundLine ? (
    <span>
      Charged <span className="text-fg font-medium">{used}</span> {plural(used, "credit")}
      {transcribedCount != null && <> · {transcribedCount} transcribed</>}
      {skippedCount != null && skippedCount > 0 && <> · {skippedCount} skipped</>}
      {" — "}{back} {plural(back, "credit")} {REFUND_TAIL}.
    </span>
  ) : (
    <span>{metaBits.join(" · ")}</span>
  )

  const breakdown = hasBreakdown && (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors cursor-pointer"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {open ? "Hide" : "Show"} {videos!.length} {plural(videos!.length, "video")}
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle overflow-hidden">
          {videos!.map(v => (
            <li key={v.videoId} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
              <span className="truncate text-fg">{v.title || v.videoId}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">
                {v.state === "charged" && `${v.credits ?? 0} ${plural(v.credits ?? 0, "credit")}`}
                {v.state === "free" && "Free"}
                {v.state === "skipped" && (SKIP_LABEL[v.errorType || ""] || "Skipped — not charged")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const overshootStrip = isOvershoot && (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-subtle px-3 py-2 text-xs text-fg-muted">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
      <span>{overshootCopy(reserved!, used, back)}</span>
    </div>
  )

  // Embedded: no chrome, no header — just the credit content (parent already has a header).
  if (embedded) {
    return (
      <div className={cn("text-left", className)}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-fg-muted tabular-nums">{creditLine}</p>
          {libraryHref && (
            <a href={libraryHref} className="shrink-0 text-xs font-medium text-accent hover:underline">
              View in Library
            </a>
          )}
        </div>
        {breakdown}
        {overshootStrip}
      </div>
    )
  }

  const tone = isError ? "border-border bg-surface-elevated" : "border-success/30 bg-success-subtle"

  return (
    <div className={cn("mb-4 rounded-xl border px-4 py-3 text-left animate-in fade-in slide-in-from-top-2 duration-300", tone, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {isError
            ? <Info className="h-4 w-4 shrink-0 mt-0.5 text-fg-muted" />
            : <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-success" />}
          <div className="min-w-0">
            <p className={cn("font-semibold text-sm", isError ? "text-fg" : "text-success-fg dark:text-success")}>
              {isError ? "Not charged — the transcription didn't complete." : headline}
            </p>
            {isError
              ? (hasRefund && (
                  <p className="text-xs text-fg-muted mt-0.5">{back} {plural(back, "credit")} {REFUND_TAIL}.</p>
                ))
              : <p className="text-xs text-fg-muted mt-0.5 tabular-nums">{creditLine}</p>}
          </div>
        </div>
        {!isError && libraryHref && (
          <a
            href={libraryHref}
            className="shrink-0 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-medium text-success-fg dark:text-success hover:bg-success-subtle transition-colors"
          >
            View in Library
          </a>
        )}
      </div>
      {!isError && breakdown}
      {overshootStrip}
    </div>
  )
}
