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
    </div>
  )
}
