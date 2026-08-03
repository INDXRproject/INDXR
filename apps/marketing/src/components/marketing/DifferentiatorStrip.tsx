import { Puzzle, Infinity as InfinityIcon, Gift, type LucideIcon } from "lucide-react"

interface Differentiator {
  icon: LucideIcon
  heading: string
  description: string
}

const differentiators: Differentiator[] = [
  {
    icon: Puzzle,
    heading: "No browser extension",
    description: "Works entirely in the browser. Nothing to install, nothing to trust.",
  },
  {
    icon: InfinityIcon,
    heading: "No subscription — credits never expire",
    description: "Pay once for credits. Use them whenever you need. No recurring charge.",
  },
  {
    icon: Gift,
    heading: "Free tier that's actually useful",
    // Honest limit for anonymous use: 10 caption extractions per 24h, TXT download (see /docs/reference/limits).
    description: "Ten YouTube-caption extractions a day with no account, downloadable as text. A free account lifts the limit and unlocks every export format — no card, no trial clock.",
  },
]

export function DifferentiatorStrip() {
  return (
    <div className="w-full py-12 border-b border-[var(--border)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {differentiators.map((d) => {
            const Icon = d.icon
            return (
              <div key={d.heading} className="flex gap-4 items-start">
                <Icon className="h-6 w-6 shrink-0 text-[var(--accent)]" aria-hidden="true" strokeWidth={1.75} />
                <div>
                  <h4 className="font-semibold text-[var(--fg)] mb-1">{d.heading}</h4>
                  <p className="text-sm text-[var(--fg-subtle)]">{d.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
