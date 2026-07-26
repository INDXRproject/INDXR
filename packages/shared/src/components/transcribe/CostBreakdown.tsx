import type { ReactNode } from "react"

import { cn } from "../../lib/utils"
import { METHOD_META, UNAVAILABLE_BAR, UNAVAILABLE_DOT } from "./method"

/**
 * Cost breakdown (ADR-080): a horizontal cost bar in method colours + a legend with
 * amounts right-aligned + a Total row where the amount is the biggest number in the
 * block. This is the single answer to "what does this cost", used by the playlist
 * confirmation (B1/B2), the video cost block (B4) and the playlist completion receipt
 * (C — where `Total` becomes `Charged` and a refund line is a segment of its own).
 *
 * The cost of a paid action is never the smallest or greyest element on screen — the
 * Total amount is ~20px, semibold, --fg-strong. Zero-count segments do not render.
 * The action bar (balance + buttons) is caller-specific and passed as `footer`.
 */

export type CostTone = "captions" | "ai" | "unavailable"

export type CostSegment = {
  key: string
  tone: CostTone
  count: number // drives bar width + whether the row renders; 0 = hidden
  label: ReactNode // left side, e.g. "5 videos · auto-captions"
  amount: ReactNode // right side, e.g. "free" / "18 credits" / "3 credits refunded"
  refund?: boolean // render the row in the error colour (a refund / not-fetched line)
}

function barClass(tone: CostTone) {
  return tone === "unavailable" ? UNAVAILABLE_BAR : METHOD_META[tone].bar
}
function dotClass(tone: CostTone) {
  return tone === "unavailable" ? UNAVAILABLE_DOT : METHOD_META[tone].dot
}

export function CostBreakdown({
  segments,
  totalLabel = "Total",
  totalAmount,
  footer,
  className,
}: {
  segments: CostSegment[]
  totalLabel?: string
  totalAmount: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const shown = segments.filter((s) => s.count > 0)
  const total = shown.reduce((a, s) => a + s.count, 0) || 1

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <div className="p-4">
        {shown.length > 0 && (
          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            {shown.map((s) => (
              <div key={s.key} className={barClass(s.tone)} style={{ width: `${(s.count / total) * 100}%` }} />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1">
          {shown.map((s) => (
            <div
              key={s.key}
              className={cn(
                "flex items-center justify-between gap-3 text-[13px]",
                s.refund ? "text-error" : "text-fg-subtle"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("inline-block h-2 w-2 shrink-0 rounded-[2px]", dotClass(s.tone))} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">{s.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
        <span className="font-medium">{totalLabel}</span>
        <span className="text-[20px] font-semibold tabular-nums text-fg-strong">{totalAmount}</span>
      </div>

      {footer && <div className="border-t border-border bg-surface-elevated px-4 py-3">{footer}</div>}
    </div>
  )
}

/**
 * "Can I afford this" — secondary but readable (13px, --fg-subtle), never --fg-muted.
 * Short of credits reads in the error colour. Callers pair it with real escape hatches
 * (Deselect some / Buy credits), never a dead disabled button.
 */
export function BalanceLine({ have, cost, className }: { have: number | null; cost: number; className?: string }) {
  if (have == null) return null
  const left = have - cost
  if (left >= 0) {
    return (
      <span className={cn("text-[13px] text-fg-subtle", className)}>
        You have {have} · {left} left after this
      </span>
    )
  }
  return (
    <span className={cn("text-[13px] text-error", className)}>
      {cost - have} credit{cost - have === 1 ? "" : "s"} short — you have {have}
    </span>
  )
}
