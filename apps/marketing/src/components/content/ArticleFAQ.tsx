import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"

/**
 * Collapsible FAQ used by every article template. Built on the native <details>/<summary>
 * element on purpose: the answer stays in the HTML at all times (present but collapsed), so
 * crawlers and AI readers still see it, and it needs no client JavaScript to open and close.
 * The FAQPage JSON-LD in each template already carries the same answers.
 */
export function ArticleFAQ({ faqs }: { faqs: Array<{ q: string; a: ReactNode }> }) {
  return (
    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {faqs.map(({ q, a }, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-[var(--fg)] [&::-webkit-details-marker]:hidden">
            <span>{q}</span>
            <ChevronDown
              aria-hidden
              className="h-4 w-4 flex-shrink-0 text-[var(--fg-muted)] transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="pb-4 text-sm leading-relaxed text-[var(--fg-subtle)]">{a}</div>
        </details>
      ))}
    </div>
  )
}
