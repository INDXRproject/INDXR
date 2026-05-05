import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "SRT Subtitles Export — INDXR.AI Docs",
  description: "SRT (SubRip Text) is the most widely supported subtitle format. INDXR exports SRT with sequential index numbers, HH:MM:SS,mmm timestamps, and caption text per segment.",
}

export default function DocsExportSrtPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "SRT Subtitles",
    description: "SRT (SubRip Text) is the most widely supported subtitle format. INDXR exports SRT with sequential index numbers, HH:MM:SS,mmm timestamps, and caption text per segment.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/srt",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "SRT" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">SRT Subtitles</h1>
        <DefinitionLeadOpening>
          SRT (SubRip Text) is the most widely supported subtitle format. INDXR exports SRT with sequential index numbers, HH:MM:SS,mmm timestamps, and caption text per segment. Compatible with VLC, YouTube, DaVinci Resolve, and most video editors.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "VTT", href: "/docs/how-indxr-works/export-formats/vtt" },
            { label: "CSV", href: "/docs/how-indxr-works/export-formats/csv" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
