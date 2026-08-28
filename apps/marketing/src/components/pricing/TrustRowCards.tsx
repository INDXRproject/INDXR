// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
import { CreditCard, Clock, Gift } from "lucide-react"
import { FREE_TIER, CREDIT_COSTS, summaryCreditCost } from "@indxr/shared/lib/pricing"

// Welcome-credit examples derived from pricing.ts — never typed numbers. Both examples anchor to the
// SAME video length so they stay mutually consistent: the welcome credits buy either one AI
// transcription of `welcomeMinutes` minutes (1 credit/min), OR as many AI summaries of a video that
// length as those credits cover (each ⌈min/10⌉ credits → 3 for a 25-min video → 25/3 → 8).
const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = welcomeCredits / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const welcomeSummaries = Math.floor(welcomeCredits / summaryCreditCost(welcomeMinutes * 60))

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
    heading: `${welcomeCredits} free credits on signup`,
    body: `No credit card required. Enough for a ${welcomeMinutes}-minute AI transcription, or ${welcomeSummaries} AI summaries of the same length.`,
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
