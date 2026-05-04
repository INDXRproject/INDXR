import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Markdown Export — INDXR.AI Docs",
  description: "The Markdown export includes a YAML frontmatter block with video title, URL, date, and duration. Compatible with Obsidian, Notion, Logseq, and any Markdown editor.",
}

export default function DocsExportMarkdownPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Markdown Export",
    description: "The Markdown export includes a YAML frontmatter block with video title, URL, date, and duration. Compatible with Obsidian, Notion, Logseq, and any Markdown editor.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/markdown",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Markdown" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Markdown Export</h1>
        <DefinitionLeadOpening>
          The Markdown export includes a YAML frontmatter block with video title, URL, date, and duration. The transcript body uses heading-level chapter markers when available. Compatible with Obsidian, Notion, Logseq, and any Markdown editor.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Plain text", href: "/docs/how-indxr-works/export-formats/txt" },
            { label: "JSON", href: "/docs/how-indxr-works/export-formats/json" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
