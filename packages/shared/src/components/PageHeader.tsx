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
    <header className={`${compact ? "pt-2" : "pt-24 sm:pt-28"} pb-8 mb-10 border-b-2 border-[var(--fg-strong)]`}>
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)] mb-4">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl sm:text-5xl font-bold leading-[1] tracking-[-0.04em] text-[var(--fg-strong)]">{title}</h1>
      {lead && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--fg-subtle)]">{lead}</p>
      )}
    </header>
  )
}
