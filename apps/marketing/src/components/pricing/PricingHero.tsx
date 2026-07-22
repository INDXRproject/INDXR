// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
import { Clock, Gift } from "lucide-react"

export function PricingHero() {
  return (
    <div className="text-center max-w-3xl mx-auto space-y-6 py-16">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fg)]">
        Pay once. Use when you need it.
      </h1>
      <p className="text-xl text-[var(--fg-subtle)] max-w-2xl mx-auto">
        Auto-caption extraction is always free. Credits apply only when you use AI transcription, playlist caption processing beyond the first three videos, AI summaries, or RAG JSON export.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)]">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--fg-subtle)]">Credits never expire</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)]">
          <Gift className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--fg-subtle)]">25 free credits when you sign up</span>
        </div>
      </div>
    </div>
  )
}
