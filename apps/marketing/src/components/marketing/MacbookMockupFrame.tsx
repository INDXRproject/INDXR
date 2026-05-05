// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

interface MacbookMockupFrameProps {
  children?: React.ReactNode
  label?: string
}

export function MacbookMockupFrame({ children, label }: MacbookMockupFrameProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Mockup chrome bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        {label && (
          <span className="ml-2 text-xs text-[var(--fg-muted)]">{label}</span>
        )}
      </div>
      {/* Content area */}
      <div className="p-4 min-h-[180px] flex items-center justify-center">
        {children ?? (
          <span className="text-xs text-[var(--fg-muted)]">[mockup placeholder]</span>
        )}
      </div>
    </div>
  )
}
