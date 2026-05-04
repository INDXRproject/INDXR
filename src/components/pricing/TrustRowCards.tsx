// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
import { CreditCard, Clock, Gift } from "lucide-react"

const trustItems = [
  {
    Icon: CreditCard,
    heading: "One-time purchase",
    body: "No subscription, no automatic renewal. Buy when you need to.",
  },
  {
    Icon: Clock,
    heading: "Credits never expire",
    body: "Buy in April, use in October. Or next year. They'll be there.",
  },
  {
    Icon: Gift,
    heading: "25 free credits on signup",
    body: "No credit card required. Enough for a 25-minute AI transcription or 8 AI summaries.",
  },
]

export function TrustRowCards() {
  return (
    <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12">
      {trustItems.map(({ Icon, heading, body }) => (
        <div key={heading} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex gap-4">
          <Icon className="h-5 w-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-[var(--fg)] mb-1">{heading}</p>
            <p className="text-sm text-[var(--fg-muted)]">{body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
