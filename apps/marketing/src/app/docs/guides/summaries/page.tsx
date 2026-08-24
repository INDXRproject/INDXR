import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, AI_SUMMARY_BASE_MINUTES, AI_SUMMARY_STEP_MINUTES, summaryCreditCost } from "@indxr/shared/lib/pricing"
import { summaryModelName } from "@indxr/shared/lib/models"

const baseCost = CREDIT_COSTS.AI_SUMMARY
const oneHourCost = summaryCreditCost(60 * 60)

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/summaries" },
  title: "Summaries — INDXR.AI Docs",
  description:
    "Turn a transcript into an AI summary organised into chapters with clickable timestamps. A summary starts at 3 credits and scales with the video's length, is saved alongside the transcript, and can be regenerated — which replaces the current summary.",
  robots: { index: true, follow: true },
}

export default function DocsSummariesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Summaries",
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/summaries",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Summaries" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Summaries</h1>
        <DefinitionLeadOpening>
          A summary is an AI-written breakdown of a transcript: a short overview of the whole video,
          followed by chapters — each with its own heading, a clickable timestamp that jumps the player
          to that moment, and worked-out notes of what was said. It turns an hour of talking into
          something you can skim in a minute, to decide whether a video is worth watching in full or to
          capture the gist for your notes. You generate it from a transcript you already have.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What a summary costs</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A summary costs {baseCost} credits for a video up to {AI_SUMMARY_BASE_MINUTES} minutes, then
          1 more credit for each additional {AI_SUMMARY_STEP_MINUTES} minutes (or part of them) — so the
          price scales with how much there is to read. A {AI_SUMMARY_BASE_MINUTES}-minute video costs
          {" "}{summaryCreditCost(AI_SUMMARY_BASE_MINUTES * 60)} credits, a one-hour talk {oneHourCost}{" "}
          credits, and a four-hour video {summaryCreditCost(4 * 60 * 60)} credits. If generation fails,
          the credits are refunded automatically.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Summaries run on {summaryModelName()} — an AI model reached through an EU-based gateway, so
          the transcript text stays in the EU while it&apos;s summarised.
        </p>

        <AnchorHeading as="h2">Where it&apos;s saved</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The summary is saved with its transcript, so it&apos;s there whenever you open it in your
          library. It&apos;s read-only — to refresh it after editing the transcript, or to get a
          different take, you regenerate it rather than editing the text in place.
        </p>

        <AnchorHeading as="h2">Regenerating replaces the current summary</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can generate a fresh summary for the same transcript. Regenerating costs the same as the
          first time — {baseCost} credits plus the length-based amount above — and{" "}
          <strong>overwrites</strong> the current summary; the previous one is not kept. INDXR asks you
          to confirm before it does.
        </p>
        <DocsCallout variant="costs-credits">
          Regenerating is a fresh credit charge (the same length-based amount) and replaces what&apos;s
          there. If there&apos;s a summary you want to keep, copy it out before regenerating.
        </DocsCallout>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "cost of 3 credits up to 30 min, +1 per started 20 min after, refund on failure", verifiedAgainst: "packages/shared/src/lib/pricing.ts (summaryCreditCost); backend/credit_manager.py:90-108 (calculate_summary_cost)" },
            { publisher: "INDXR (own code)", supports: "two-step chapters + clickable timestamps, read-only", verifiedAgainst: "backend/summary_pipeline.py; apps/app/src/components/library/AiSummaryView.tsx; ADR-090" },
            { publisher: "INDXR (own code)", supports: "model + EU gateway", verifiedAgainst: "packages/shared/src/lib/models.ts:41-43 (summaryModelName); backend/main.py:1126-1132" },
            { publisher: "INDXR (own code)", supports: "saved with transcript, regenerate overwrites", verifiedAgainst: "backend/summary_pipeline.py (run_summary_reservation_aware); apps/app/src/components/library/TranscriptViewer.tsx" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Library", href: "/docs/guides/library" },
          ]}
        />
      </DocsShell>
    </>
  )
}
