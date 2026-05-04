import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "How INDXR Works — INDXR.AI Docs",
  description: "INDXR extracts transcripts from YouTube videos by fetching auto-generated captions where available, and using AI transcription via AssemblyAI when captions are absent.",
}

export default function DocsHowIndxrWorksOverviewPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How INDXR Works",
    description: "INDXR extracts transcripts from YouTube videos by fetching auto-generated captions where available, and using AI transcription via AssemblyAI when captions are absent.",
    url: "https://indxr.ai/docs/how-indxr-works/overview",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Overview" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How INDXR Works</h1>
        <DefinitionLeadOpening>
          INDXR extracts transcripts from YouTube videos by fetching auto-generated captions where available, and using AI transcription via AssemblyAI when captions are absent. Transcripts are exported in six formats including RAG-optimized JSON for AI pipelines.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "How credits work", href: "/docs/how-indxr-works/credits" },
            { label: "Accuracy", href: "/docs/how-indxr-works/accuracy" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Quickstart", href: "/docs/getting-started" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
