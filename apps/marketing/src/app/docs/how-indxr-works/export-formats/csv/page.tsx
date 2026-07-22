import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "CSV Export — INDXR.AI Docs",
  description: "The CSV export produces a spreadsheet-compatible file with columns for start time, end time, and text. One row per caption segment.",
}

export default function DocsExportCsvPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "CSV Export",
    description: "The CSV export produces a spreadsheet-compatible file with columns for start time, end time, and text. One row per caption segment.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/csv",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "CSV" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">CSV Export</h1>
        <DefinitionLeadOpening>
          The CSV export produces a spreadsheet-compatible file with columns for start time, end time, and text. One row per caption segment. Compatible with Excel, Google Sheets, and data analysis tools.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Plain text", href: "/docs/how-indxr-works/export-formats/txt" },
            { label: "SRT", href: "/docs/how-indxr-works/export-formats/srt" },
          ]}
        />
      </DocsShell>
    </>
  )
}
