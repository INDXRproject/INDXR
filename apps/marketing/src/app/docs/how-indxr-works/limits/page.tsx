import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsTable } from "@/components/docs/DocsTable"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Limits — INDXR.AI Docs",
  description:
    "The hard limits INDXR enforces: AI transcription up to 10 hours per file, uploads up to 500 MB, playlists up to 500 videos per job, 3 concurrent jobs, and request rate limits. Caption extraction has no length limit. There is no public REST API.",
}

export default function DocsLimitsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Limits",
    description: metadata.description,
    url: "https://indxr.ai/docs/how-indxr-works/limits",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account", href: "/docs" },
            { label: "Limits" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Limits</h1>
        <DefinitionLeadOpening>
          INDXR enforces a few hard limits: AI transcription up to 10 hours per file, uploads up to
          500 MB, playlists up to 500 videos per job, and 3 jobs running at once. Caption extraction has
          no length limit, and requests are rate-limited. There is no public REST API.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Size &amp; length</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Limit</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>AI transcription — max duration</td><td>10 hours per file</td></tr>
            <tr><td>Audio/video upload — max size</td><td>500 MB</td></tr>
            <tr><td>Upload — accepted files</td><td>.mp3, .mp4, .mpeg, .mpga, .m4a, .wav, .webm, .ogg, .flac</td></tr>
            <tr><td>Playlist — max videos per job</td><td>500</td></tr>
            <tr><td>Concurrent jobs (per account)</td><td>3</td></tr>
            <tr><td>Caption extraction — duration</td><td>No limit</td></tr>
          </tbody>
        </DocsTable>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Audio over 10 hours is rejected before any credits are reserved — you are never charged for a
          file the provider can&apos;t process. A playlist over 500 videos is rejected the same way;
          split it into batches of 500.
        </p>

        <AnchorHeading as="h2">Rate limits</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Who</th>
              <th>Requests</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Anonymous (no account)</td><td>10 per 24 hours (per IP)</td></tr>
            <tr><td>Signed in</td><td>50 per hour</td></tr>
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">No public API</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          INDXR is a web app — there is no public REST API. Everything runs through the interface; the
          export formats (including <a className="text-[var(--accent)] hover:underline" href="/docs/how-indxr-works/export-formats/json">JSON and RAG JSON</a>) are how you get the data out programmatically.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "duration, playlist, concurrency and upload limits", verifiedAgainst: "backend/main.py (MAX_TRANSCRIPTION_SECONDS, MAX_PLAYLIST_VIDEOS, MAX_CONCURRENT_JOBS); backend/audio_utils.py (SUPPORTED_FORMATS, MAX_FILE_SIZE_MB)" },
            { publisher: "INDXR (own code)", supports: "rate limits", verifiedAgainst: "packages/shared/src/lib/ratelimit.ts" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Overview", href: "/docs/how-indxr-works/overview" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
