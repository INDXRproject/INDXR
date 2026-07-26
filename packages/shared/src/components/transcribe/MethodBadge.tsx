import type { ReactNode } from "react"

import { cn } from "../../lib/utils"
import { METHOD_META, type TranscribeMethod } from "./method"

/**
 * Compact method badge in the method colour (ADR-080). Used on per-video rows,
 * progress rows and the video cost header, so a method reads at a glance and the
 * colour matches the Library badge for the same transcript.
 *
 * Pass the text as children, e.g. `<MethodBadge method="ai">AI · 21 cr</MethodBadge>`.
 */
export function MethodBadge({
  method,
  children,
  className,
}: {
  method: TranscribeMethod
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        METHOD_META[method].badge,
        className
      )}
    >
      {children}
    </span>
  )
}
