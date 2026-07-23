// Section marker for the card grids (/articles, /docs): an accent dot, an uppercase label,
// and a hairline that fills the row. Categories no longer carry their own colour — the only
// accent is the brand accent; separation comes from the name and the whitespace.
export function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-2 w-2 rounded-full shrink-0 bg-[var(--accent)]" />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">{label}</h2>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}
