import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "How Credits Work — INDXR.AI Docs",
  description: "INDXR credits are the unit of account for paid operations. Caption extraction is always free. AI transcription costs 1 credit per minute of audio (minimum 1).",
}

export default function DocsHowCreditsWorkPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How Credits Work",
    description: "INDXR credits are the unit of account for paid operations. Caption extraction is always free. AI transcription costs 1 credit per minute of audio (minimum 1).",
    url: "https://indxr.ai/docs/how-indxr-works/credits",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "How credits work" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How Credits Work</h1>
        <DefinitionLeadOpening>
          INDXR credits are the unit of account for paid operations. Caption extraction is always free. AI transcription costs 1 credit per minute of audio (minimum 1). AI summarization costs 3 credits per summary. Credits never expire after purchase.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
            { label: "Pricing", href: "/pricing" },
            { label: "Limits", href: "/docs/how-indxr-works/limits" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
