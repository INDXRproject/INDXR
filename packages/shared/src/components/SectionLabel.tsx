import type { ReactNode } from "react"

// Section marker for the card grids and page sections (marketing /articles, /docs, /pricing
// and app /dashboard, /dashboard/billing): an accent dot, an uppercase label, and a hairline
// that fills the row. Categories/sections carry no colour of their own — the only accent is the
// brand accent; separation comes from the name and the whitespace. An optional `action` (e.g. a
// "View all" link) sits at the far right, after the hairline.
export function SectionLabel({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-2 w-2 rounded-full shrink-0 bg-[var(--accent)]" />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">{label}</h2>
      <span className="h-px flex-1 bg-[var(--border)]" />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
