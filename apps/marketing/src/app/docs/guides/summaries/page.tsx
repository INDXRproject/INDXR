import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"
import { summaryModelName } from "@indxr/shared/lib/models"

const summaryCost = CREDIT_COSTS.AI_SUMMARY

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/summaries" },
  title: "Summaries — INDXR.AI Docs",
  description:
    "Turn a transcript into an AI summary with key points. A summary costs a flat 3 credits regardless of the video's length, is saved alongside the transcript, can be edited without losing the AI's version, and can be regenerated — which replaces the current summary.",
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
          A summary is a short AI-written overview of a transcript, with the key points pulled out. It
          turns an hour of talking into something you can read in a minute — useful for deciding whether
          a video is worth watching in full, or for capturing the gist for your notes. You generate it
          from a transcript you already have.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">A summary costs a flat 3 credits</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Every summary costs {summaryCost} credits, whatever the length of the video — a five-minute
          clip and a two-hour talk cost the same. If generation fails, the credits are refunded
          automatically.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Summaries run on {summaryModelName()} — an AI model reached through an EU-based gateway, so
          the transcript text stays in the EU while it&apos;s summarised.
        </p>

        <AnchorHeading as="h2">Where it&apos;s saved, and editing it</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The summary is saved with its transcript, so it&apos;s there whenever you open it in your
          library. You can edit the summary text, and — as with the transcript itself — your edits are
          kept separately from the AI&apos;s original version, which stays intact underneath.
        </p>

        <AnchorHeading as="h2">Regenerating replaces the current summary</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can generate a fresh summary for the same transcript. Regenerating costs another
          {" "}{summaryCost} credits and <strong>overwrites</strong> the current summary — the previous
          one is not kept. INDXR asks you to confirm before it does.
        </p>
        <DocsCallout variant="costs-credits">
          Regenerating is a new {summaryCost}-credit charge and replaces what&apos;s there. If
          you&apos;ve edited a summary you want to keep, copy it out before regenerating.
        </DocsCallout>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "flat 3-credit cost regardless of length, refund on failure", verifiedAgainst: "packages/shared/src/lib/pricing.ts (AI_SUMMARY); backend/main.py:1145-1156,1249,1179" },
            { publisher: "INDXR (own code)", supports: "model + EU gateway", verifiedAgainst: "packages/shared/src/lib/models.ts:41-43 (summaryModelName); backend/main.py:1126-1132" },
            { publisher: "INDXR (own code)", supports: "saved with transcript, edited kept separately, regenerate overwrites", verifiedAgainst: "backend/main.py:1257-1269; apps/app/src/components/library/AiSummaryView.tsx:87-96; TranscriptViewer.tsx:1127" },
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
