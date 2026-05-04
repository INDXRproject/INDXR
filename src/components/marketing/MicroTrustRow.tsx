// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

interface TrustSignal {
  icon: string
  label: string
}

const defaultSignals: TrustSignal[] = [
  { icon: "✓", label: "No signup needed for single videos" },
  { icon: "✓", label: "No browser extension" },
  { icon: "✓", label: "Works with any YouTube URL" },
]

interface MicroTrustRowProps {
  signals?: TrustSignal[]
  className?: string
}

export function MicroTrustRow({ signals, className }: MicroTrustRowProps) {
  const items = signals ?? defaultSignals

  return (
    <div className={`flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 ${className ?? ""}`}>
      {items.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          <span className="text-[var(--accent)] font-semibold">{s.icon}</span>
          {s.label}
        </span>
      ))}
    </div>
  )
}
