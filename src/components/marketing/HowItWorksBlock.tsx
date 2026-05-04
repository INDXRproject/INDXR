// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

interface HowItWorksBlockProps {
  number: number
  heading: string
  description: string
  audience?: string
  mockup?: React.ReactNode
  reversed?: boolean
}

export function HowItWorksBlock({
  number,
  heading,
  description,
  audience,
  mockup,
  reversed = false,
}: HowItWorksBlockProps) {
  return (
    <div className={`flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 py-16 border-b border-[var(--border)]`}>
      {/* Text side */}
      <div className="flex-1 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {String(number).padStart(2, "0")}
        </div>
        <h3 className="text-2xl font-bold text-[var(--fg)]">{heading}</h3>
        <p className="text-[var(--fg-subtle)] leading-relaxed">{description}</p>
        {audience && (
          <p className="text-xs text-[var(--fg-muted)] italic">For: {audience}</p>
        )}
      </div>
      {/* Mockup side */}
      <div className="flex-1 w-full">
        {mockup ?? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] min-h-[200px] flex items-center justify-center">
            <span className="text-xs text-[var(--fg-muted)]">[mockup — block {number}]</span>
          </div>
        )}
      </div>
    </div>
  )
}
