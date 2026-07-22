import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Export Formats — INDXR.AI Docs",
  description: "INDXR exports transcripts in seven formats: plain text, plain text with timestamps, Markdown, CSV, SRT, VTT, and RAG-optimized JSON.",
}

export default function DocsExportFormatsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Export Formats",
    description: "INDXR exports transcripts in seven formats: plain text, plain text with timestamps, Markdown, CSV, SRT, VTT, and RAG-optimized JSON.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Export formats" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Export Formats</h1>
        <DefinitionLeadOpening>
          INDXR exports transcripts in seven formats: plain text, plain text with timestamps, Markdown, CSV, SRT, VTT, and RAG-optimized JSON. All formats are available for both caption extraction and AI transcription.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Plain text", href: "/docs/how-indxr-works/export-formats/txt" },
            { label: "SRT", href: "/docs/how-indxr-works/export-formats/srt" },
            { label: "RAG JSON", href: "/docs/how-indxr-works/export-formats/json" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
          ]}
        />
      </DocsShell>
    </>
  )
}
