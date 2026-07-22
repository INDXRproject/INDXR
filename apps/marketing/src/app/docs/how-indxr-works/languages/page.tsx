import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { transcriptionModelName } from "@indxr/shared/lib/models"

const langDescription = `INDXR supports transcript extraction in any language with YouTube auto-captions. For AI transcription, INDXR automatically uses the best model for your video's language — our highest-quality model, ${transcriptionModelName()}, for the languages it supports, with broad coverage across 99+ languages.`

export const metadata: Metadata = {
  title: "Supported Languages — INDXR.AI Docs",
  description: langDescription,
}

export default function DocsLanguagesPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Supported Languages",
    description: langDescription,
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
          INDXR supports transcript extraction in any language with YouTube auto-captions. For AI transcription, INDXR automatically uses the best model for your video&apos;s language — our highest-quality model, {transcriptionModelName()}, for the languages it supports, with broad coverage across 99+ languages. Language is detected automatically from the video — no selection required.
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
