import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Limits — INDXR.AI Docs",
  description: "INDXR enforces limits on file size for audio uploads, request rate, and concurrent jobs. Caption extraction from YouTube has no video-length limit.",
}

export default function DocsLimitsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Limits",
    description: "INDXR enforces limits on file size for audio uploads, request rate, and concurrent jobs. Caption extraction from YouTube has no video-length limit.",
    url: "https://indxr.ai/docs/how-indxr-works/limits",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Limits" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Limits</h1>
        <DefinitionLeadOpening>
          INDXR enforces limits on file size for audio uploads, request rate, and concurrent jobs. These limits apply per account. Caption extraction from YouTube has no video-length limit. AI transcription is rate-limited to prevent abuse.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-muted)] text-sm">[Placeholder — content coming soon]</p>
        <RelatedTopicsList
          topics={[
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
            { label: "Account and billing", href: "/docs/account-and-data/credits-and-billing" },
          ]}
        />
      </DocsShell>
    </>
  )
}
