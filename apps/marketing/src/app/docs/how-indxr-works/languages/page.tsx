import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Supported Languages — INDXR.AI Docs",
  description: "INDXR supports transcript extraction in any language with YouTube auto-captions. For AI transcription, AssemblyAI Universal-3 supports 99+ languages.",
}

export default function DocsLanguagesPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Supported Languages",
    description: "INDXR supports transcript extraction in any language with YouTube auto-captions. For AI transcription, AssemblyAI Universal-3 supports 99+ languages.",
    url: "https://indxr.ai/docs/how-indxr-works/languages",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Supported languages" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Supported Languages</h1>
        <DefinitionLeadOpening>
          INDXR supports transcript extraction in any language with YouTube auto-captions. For AI transcription, AssemblyAI Universal-3 supports 99+ languages. Language is detected automatically from the video — no selection required.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Accuracy", href: "/docs/how-indxr-works/accuracy" },
            { label: "AI transcription accuracy", href: "/docs/how-indxr-works/accuracy/ai-transcription" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
