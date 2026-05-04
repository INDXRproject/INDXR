import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Transcription Accuracy — INDXR.AI Docs",
  description: "INDXR offers two transcription methods with different accuracy profiles. Auto-captions from YouTube are verbatim. AI transcription via AssemblyAI Universal-3 achieves 99.4% word accuracy.",
}

export default function DocsAccuracyPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Transcription Accuracy",
    description: "INDXR offers two transcription methods with different accuracy profiles. Auto-captions from YouTube are verbatim. AI transcription via AssemblyAI Universal-3 achieves 99.4% word accuracy.",
    url: "https://indxr.ai/docs/how-indxr-works/accuracy",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Accuracy" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Transcription Accuracy</h1>
        <DefinitionLeadOpening>
          INDXR offers two transcription methods with different accuracy profiles. Auto-captions from YouTube are verbatim from video creators or YouTube&apos;s own speech recognition. AI transcription via AssemblyAI Universal-3 achieves 99.4% word accuracy on clean English audio.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Auto-captions", href: "/docs/how-indxr-works/accuracy/auto-captions" },
            { label: "AI transcription", href: "/docs/how-indxr-works/accuracy/ai-transcription" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
