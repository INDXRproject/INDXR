import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "API — INDXR.AI Docs",
  description: "INDXR does not currently offer a public REST API. All transcript extraction, AI transcription, and export functionality is available through the web interface at indxr.ai.",
}

export default function DocsApiPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "API",
    description: "INDXR does not currently offer a public REST API. All transcript extraction, AI transcription, and export functionality is available through the web interface at indxr.ai.",
    url: "https://indxr.ai/docs/how-indxr-works/api",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "API" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">API</h1>
        <DefinitionLeadOpening>
          INDXR does not currently offer a public REST API. All transcript extraction, AI transcription, and export functionality is available through the web interface at indxr.ai.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Getting started", href: "/docs/getting-started" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
