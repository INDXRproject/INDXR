import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Your library — INDXR.AI Docs",
  description:
    "Every transcript you extract is saved to your library, where you can edit it while keeping the original, group transcripts into collections, search across them, and delete what you no longer need.",
  robots: { index: true, follow: true },
}

export default function DocsYourLibraryPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Your library",
    description: metadata.description,
    url: "https://indxr.ai/docs/using-indxr/your-library",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Using INDXR", href: "/docs" },
            { label: "Your library" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Your library</h1>
        <DefinitionLeadOpening>
          Your library is where every transcript you extract is kept. You can edit a transcript while
          the original stays intact, group transcripts into collections, search across all of them,
          and delete the ones you no longer need.
        </DefinitionLeadOpening>
        <RelatedTopicsList
          topics={[
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Settings", href: "/docs/account/settings" },
            { label: "What happens to my data", href: "/privacy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
