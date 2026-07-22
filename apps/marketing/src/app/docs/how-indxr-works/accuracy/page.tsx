import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { transcriptionModelName } from "@indxr/shared/lib/models"

const accDescription = `INDXR offers two transcription methods with different accuracy profiles. Auto-captions from YouTube are verbatim. For AI transcription, INDXR automatically uses the best model for your video's language — our highest-quality model, ${transcriptionModelName()}, achieves 99.4% word accuracy on clean English audio.`

export const metadata: Metadata = {
  title: "Transcription Accuracy — INDXR.AI Docs",
  description: accDescription,
}

export default function DocsAccuracyPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Transcription Accuracy",
    description: accDescription,
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
          INDXR offers two transcription methods with different accuracy profiles. Auto-captions from YouTube are verbatim from video creators or YouTube&apos;s own speech recognition. For AI transcription, INDXR automatically uses the best model for your video&apos;s language — our highest-quality model, {transcriptionModelName()}, achieves 99.4% word accuracy on clean English audio.
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
