import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Plain Text Export — INDXR.AI Docs",
  description: "The TXT export produces a clean transcript without formatting. Available with or without timestamps. TXT is the only format available to anonymous users.",
}

export default function DocsExportTxtPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Plain Text (TXT) Export",
    description: "The TXT export produces a clean transcript without formatting. Available with or without timestamps. TXT is the only format available to anonymous users.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/txt",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Plain text" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Plain Text (TXT) Export</h1>
        <DefinitionLeadOpening>
          The TXT export produces a clean transcript without formatting. Available with or without timestamps. Timestamps are formatted as [HH:MM:SS] at the start of each caption segment. TXT is the only format available to anonymous users.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Markdown", href: "/docs/how-indxr-works/export-formats/markdown" },
            { label: "CSV", href: "/docs/how-indxr-works/export-formats/csv" },
            { label: "All formats", href: "/docs/how-indxr-works/export-formats" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
