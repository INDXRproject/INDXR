import type { ReactNode } from "react"

// Shared page header for the presentation surfaces (/articles, /docs). Generous top margin
// (clears the fixed h-16 marketing header and then some, so the title has air), an optional
// accent eyebrow, the page title, an optional lead capped to a comfortable reading measure,
// and a hairline underneath. One spacing scale everywhere so the surfaces read as one system.
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string
  title: string
  lead?: ReactNode
}) {
  return (
    <header className="pt-24 sm:pt-28 pb-8 mb-10 border-b border-[var(--border)]">
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
