import type { ReactNode } from "react"

// Shared page header for the presentation surfaces (marketing /articles, /docs, /pricing and
// app /dashboard/billing). Left-aligned: accent eyebrow, title, lead on a capped reading
// measure, hairline underneath. One spacing scale and one typographic scale everywhere so the
// surfaces read as one system.
//
// `compact` only changes the TOP margin — the app shell already provides its own padding and a
// fixed marketing-header clearance isn't needed there, so the app uses a smaller top gap while
// keeping the exact same build-up and type scale. Same component, one prop; no second header.
export function PageHeader({
  eyebrow,
  title,
  lead,
  compact = false,
}: {
  eyebrow?: string
  title: string
  lead?: ReactNode
  compact?: boolean
}) {
  return (
    <header className={`${compact ? "pt-2" : "pt-24 sm:pt-28"} pb-8 mb-10 border-b border-[var(--border)]`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fg)]">{title}</h1>
      {lead && (
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--fg-muted)]">{lead}</p>
      )}
    </header>
  )
}
