import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "VTT Subtitles Export — INDXR.AI Docs",
  description: "WebVTT (VTT) is the standard subtitle format for web video. INDXR exports VTT with the required WEBVTT header and HH:MM:SS.mmm timestamps.",
}

export default function DocsExportVttPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "VTT Subtitles (WebVTT)",
    description: "WebVTT (VTT) is the standard subtitle format for web video. INDXR exports VTT with the required WEBVTT header and HH:MM:SS.mmm timestamps.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/vtt",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "VTT" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">VTT Subtitles (WebVTT)</h1>
        <DefinitionLeadOpening>
          WebVTT (VTT) is the standard subtitle format for web video. INDXR exports VTT with the required WEBVTT header and HH:MM:SS.mmm timestamps. Compatible with HTML5 video elements, Mux, Cloudflare Stream, and most video hosting platforms.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "SRT", href: "/docs/how-indxr-works/export-formats/srt" },
            { label: "All formats", href: "/docs/how-indxr-works/export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
