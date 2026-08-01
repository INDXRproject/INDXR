import { Clock, Gift } from "lucide-react"
import { PageHeader } from "@indxr/shared/components/PageHeader"

// Left-aligned so /pricing sits in the same system as /articles and /docs (it used to be the
// only centred page). Wrapped to max-w-4xl so the header's left edge lines up with the tier
// cards below it. Same PageHeader component, eyebrow + title + lead + hairline.
export function PricingHero() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Pricing"
        title="Pay once. Use when you need it."
        lead="YouTube caption extraction is always free. Credits apply only when you use AI transcription, playlist caption processing beyond the first three videos, AI summaries, or RAG JSON export."
      />
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
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
