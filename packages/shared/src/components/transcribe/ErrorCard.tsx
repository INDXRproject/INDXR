import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "../../lib/utils"

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
  return (
    <div
      className={cn(
        "rounded-xl border border-error/30 border-l-[3px] border-l-error bg-surface px-4 py-3.5 text-left",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
        <div className="min-w-0">
          <p className="font-medium text-fg">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-subtle">{body}</p>
          {creditsNote && <p className="mt-1.5 text-[13px] font-medium text-success">{creditsNote}</p>}

          {actions && actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a) => {
                const cls = cn(
                  "inline-flex h-9 min-h-[36px] items-center rounded-lg px-3.5 text-[13px] font-medium transition-colors cursor-pointer",
                  a.variant === "secondary"
                    ? "border border-border-strong text-fg-subtle hover:bg-surface-elevated"
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

          {note && <div className="mt-3 text-[13px] leading-relaxed text-fg-muted">{note}</div>}

          {code && <p className="mt-2.5 font-mono text-[11px] text-fg-muted">{code}</p>}
        </div>
      </div>
    </div>
  )
}
