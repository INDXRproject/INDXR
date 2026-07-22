import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Playlists — INDXR.AI Docs",
  description:
    "Turn a whole YouTube playlist into transcripts in one job: choose which videos to transcribe, the first three auto-caption videos are free, credits are reserved up front and the unused part is returned, and the job keeps running after you close the tab.",
  robots: { index: true, follow: true },
}

export default function DocsPlaylistsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Playlists",
    description: metadata.description,
    url: "https://indxr.ai/docs/using-indxr/playlists",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Using INDXR", href: "/docs" },
            { label: "Playlists" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Playlists</h1>
        <DefinitionLeadOpening>
          A playlist job turns a whole YouTube playlist into transcripts in one run. You choose per
          video whether to extract captions or use AI transcription; the first three auto-caption
          videos are free. Credits are reserved up front and the unused part is returned when the job
          finishes, the job keeps running after you close the tab, and a single job handles up to 500
          videos.
        </DefinitionLeadOpening>
        <RelatedTopicsList
          topics={[
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Limits", href: "/docs/how-indxr-works/limits" },
            { label: "Article: Playlist transcripts", href: "/articles/youtube-playlist-transcript" },
            { label: "Article: Bulk transcript extraction", href: "/articles/bulk-youtube-transcript" },
          ]}
        />
      </DocsShell>
    </>
  )
}
