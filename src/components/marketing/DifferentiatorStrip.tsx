// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

interface Differentiator {
  icon: string
  heading: string
  description: string
}

const differentiators: Differentiator[] = [
  {
    icon: "🔌",
    heading: "No browser extension",
    description: "Works entirely in the browser. Nothing to install, nothing to trust.",
  },
  {
    icon: "💳",
    heading: "No subscription — credits never expire",
    description: "Pay once for credits. Use them whenever you need. No recurring charge.",
  },
  {
    icon: "🎁",
    heading: "Free tier that's actually useful",
    description: "Auto-captions for any video, free, no account needed. Not a 5-second trial.",
  },
]

export function DifferentiatorStrip() {
  return (
    <div className="w-full py-12 border-b border-[var(--border)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {differentiators.map((d) => (
            <div key={d.heading} className="flex gap-4 items-start">
              <span className="text-2xl shrink-0">{d.icon}</span>
              <div>
                <h4 className="font-semibold text-[var(--fg)] mb-1">{d.heading}</h4>
                <p className="text-sm text-[var(--fg-subtle)]">{d.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
