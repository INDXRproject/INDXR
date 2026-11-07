"use client"

import { useEffect, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import posthog from "posthog-js"

import { cn } from "../../lib/utils"
import { notice, NOTICE_BODY, NOTICE_CODE, NOTICE_TITLE } from "../../lib/notice"

/**
 * One shared error surface for the whole transcribe flow (ADR-080). Fixed anatomy:
 *   · title in plain language
 *   · one or two sentences on what happened + what it means, INCLUDING whether any
 *     credits were used or refunded
 *   · one or two actions as buttons
 *   · the error code, small and muted, at the bottom
 *
 * Purely presentational. It never changes control flow — a catch that surfaces this
 * card behaves exactly as before (see errorCopy.ts / resolveErrorCopy for the copy
 * map and the neutral fallback that every unknown code still gets).
 */
export type ErrorCardAction = {
  label: string
  onClick?: () => void
  href?: string
  variant?: "primary" | "secondary"
}

export function ErrorCard({
  title,
  body,
  actions,
  code,
  creditsNote,
  note,
  className,
}: {
  title: string
  body: ReactNode
  actions?: ErrorCardAction[]
  code?: string | null
  /** Data-driven credit outcome (e.g. "3 credits refunded to your balance"). Rendered only when
      present — the card says nothing about credits rather than assert an unverified amount. */
  creditsNote?: string | null
  /** Optional quiet line below the actions — e.g. an alternative route framed as prose, not a
      priced button (bot_detection's "still blocked? use AI, it works from the audio file"). */
  note?: ReactNode
  className?: string
}) {
  // Measurement (meting 2026-11-05): we had no signal for "user hit the credit wall", so we
  // could not tell whether anyone ever needed to buy. Fires once per shown card.
  useEffect(() => {
    if (code === "insufficient_credits") posthog.capture("insufficient_credits_shown", { surface: "error_card" })
  }, [code])

  return (
    <div
      className={cn(
        notice("error"),
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
        <div className="min-w-0">
          <p className={NOTICE_TITLE}>{title}</p>
          <p className={cn("mt-1", NOTICE_BODY)}>{body}</p>
          {creditsNote && <p className="mt-1.5 text-sm font-bold text-success-fg">{creditsNote}</p>}

          {actions && actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a) => {
                const cls = cn(
                  "inline-flex h-9 min-h-[36px] items-center border-2 border-border-strong px-3.5 text-sm font-bold transition-colors cursor-pointer",
                  a.variant === "secondary"
                    ? "bg-bg text-fg-strong hover:bg-bg-subtle"
                    : "bg-accent text-fg-on-accent hover:bg-accent-hover"
                )
                return a.href ? (
                  <a key={a.label} href={a.href} className={cls}>
                    {a.label}
                  </a>
                ) : (
                  <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                    {a.label}
                  </button>
                )
              })}
            </div>
          )}

          {note && <div className="mt-3 text-sm leading-relaxed text-fg">{note}</div>}

          {code && <p className="mt-3"><span className={NOTICE_CODE}>Code · {code}</span></p>}
        </div>
      </div>
    </div>
  )
}
