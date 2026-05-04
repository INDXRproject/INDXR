// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

interface PrerequisitesBlockProps {
  items: string[]
}

export function PrerequisitesBlock({ items }: PrerequisitesBlockProps) {
  return (
    <div className="mb-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">Before you start</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[var(--fg-muted)] flex gap-2">
            <span className="text-[var(--accent)] mt-0.5">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
