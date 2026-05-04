import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "How We Handle Your Data — INDXR.AI Docs",
  description: "INDXR processes YouTube transcript data on-demand. Audio files uploaded for transcription are deleted from servers within 24 hours.",
}

export default function DocsDataHandlingPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How We Handle Your Data",
    description: "INDXR processes YouTube transcript data on-demand. Audio files uploaded for transcription are deleted from servers within 24 hours.",
    url: "https://indxr.ai/docs/account-and-data/data-handling",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account & data", href: "/docs/account-and-data/credits-and-billing" },
            { label: "How we handle your data" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How We Handle Your Data</h1>
        <DefinitionLeadOpening>
          INDXR processes YouTube transcript data on-demand. Audio files uploaded for transcription are deleted from servers within 24 hours. Extracted transcripts are stored in your account library and subject to your account&apos;s data retention settings.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Privacy policy", href: "/privacy" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
