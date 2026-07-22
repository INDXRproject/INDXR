import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"

const summaryCost = CREDIT_COSTS.AI_SUMMARY

export const metadata: Metadata = {
  title: "Summaries — INDXR.AI Docs",
  description: `INDXR can summarise any transcript into a short overview with action points for a flat ${summaryCost} credits, regardless of video length. The summary is stored with the transcript and stays editable.`,
}

export default function DocsSummariesPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Summaries",
    description: `INDXR summarises any transcript for a flat ${summaryCost} credits, regardless of length. The summary is stored with the transcript and stays editable, with the original kept alongside your edits.`,
    url: "https://indxr.ai/docs/how-indxr-works/summaries",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Summaries" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Summaries</h1>
        <DefinitionLeadOpening>
          A summary condenses a transcript into a short overview with action points. Any transcript
          can be summarised for a flat {summaryCost} credits, whatever the length of the video. The
          summary is stored with the transcript and is editable the same way, with the original kept
          alongside your edits.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What a summary costs</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          {summaryCost} credits per summary — a flat price that does not scale with the length of the
          transcript. Caption extraction stays free; summaries, AI transcription and RAG JSON are the
          features that use credits.
        </p>

        <AnchorHeading as="h2">Editing a summary</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A summary is editable like a transcript, and the original is never overwritten — your edited
          version is stored alongside it, so you keep both.
        </p>

        <p className="text-[var(--fg-muted)] text-sm mt-6">[More detail coming soon.]</p>

        <RelatedTopicsList
          topics={[
            { label: "Overview", href: "/docs/how-indxr-works/overview" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
            { label: "Accuracy and languages", href: "/docs/how-indxr-works/accuracy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
