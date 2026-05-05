import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "AI Transcription Accuracy — INDXR.AI Docs",
  description: "INDXR uses AssemblyAI Universal-3 for AI transcription. In internal benchmarks on English YouTube content, Universal-3 achieves 99.4% word-level accuracy.",
}

export default function DocsAiTranscriptionAccuracyPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "AI Transcription Accuracy",
    description: "INDXR uses AssemblyAI Universal-3 for AI transcription. In internal benchmarks on English YouTube content, Universal-3 achieves 99.4% word-level accuracy.",
    url: "https://indxr.ai/docs/how-indxr-works/accuracy/ai-transcription",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Accuracy", href: "/docs/how-indxr-works/accuracy" },
            { label: "AI transcription" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">AI Transcription Accuracy</h1>
        <DefinitionLeadOpening>
          INDXR uses AssemblyAI Universal-3 for AI transcription. In internal benchmarks on English YouTube content, Universal-3 achieves 99.4% word-level accuracy. Results vary by audio quality, speaker count, and language.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Auto-captions accuracy", href: "/docs/how-indxr-works/accuracy/auto-captions" },
            { label: "Supported languages", href: "/docs/how-indxr-works/languages" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
