import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Auto-Captions Accuracy — INDXR.AI Docs",
  description: "YouTube auto-captions are generated either by the video creator or YouTube's speech recognition. INDXR fetches these verbatim — accuracy depends entirely on the source caption quality.",
}

export default function DocsAutoCaptionsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Auto-Captions Accuracy",
    description: "YouTube auto-captions are generated either by the video creator or YouTube's speech recognition. INDXR fetches these verbatim — accuracy depends entirely on the source caption quality.",
    url: "https://indxr.ai/docs/how-indxr-works/accuracy/auto-captions",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Accuracy", href: "/docs/how-indxr-works/accuracy" },
            { label: "Auto-captions" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Auto-Captions Accuracy</h1>
        <DefinitionLeadOpening>
          YouTube auto-captions are generated either by the video creator or YouTube&apos;s speech recognition. INDXR fetches these verbatim — accuracy depends entirely on the source caption quality, not on INDXR processing.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "AI transcription accuracy", href: "/docs/how-indxr-works/accuracy/ai-transcription" },
            { label: "Transcription accuracy overview", href: "/docs/how-indxr-works/accuracy" },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
