import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "JSON and RAG JSON Export — INDXR.AI Docs",
  description: "The RAG JSON export structures transcript content in 90–120 second chunks with sentence-boundary snapping, timestamps, chapter metadata, and a deep_link field per chunk.",
}

export default function DocsExportJsonPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "JSON / RAG JSON Export",
    description: "The RAG JSON export structures transcript content in 90–120 second chunks with sentence-boundary snapping, timestamps, chapter metadata, and a deep_link field per chunk.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/json",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "JSON / RAG JSON" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">JSON / RAG JSON Export</h1>
        <DefinitionLeadOpening>
          The RAG JSON export structures transcript content in 90–120 second chunks with sentence-boundary snapping, timestamps, chapter metadata, and a deep_link field per chunk pointing to the exact moment in the video. Designed for LangChain, LlamaIndex, Pinecone, ChromaDB, Weaviate, and Qdrant.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Export formats overview", href: "/docs/how-indxr-works/export-formats" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
            { label: "RAG article", href: "/articles/youtube-transcript-for-rag" },
          ]}
        />
      </DocsShell>
    </>
  )
}
