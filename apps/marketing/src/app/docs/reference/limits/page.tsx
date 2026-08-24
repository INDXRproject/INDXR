import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsTable } from "@/components/docs/DocsTable"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { UPLOAD_EXTENSIONS, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import {
  LIBRARY_STORAGE_BASE_MB,
  LIBRARY_STORAGE_MAX_MB,
  STORAGE_BLOCK_MB,
  STORAGE_BLOCK_COST_CREDITS,
  STORAGE_MAX_UPGRADES,
} from "@indxr/shared/lib/storage"
import {
  MAX_PLAYLIST_VIDEOS_PER_JOB,
  MAX_CONCURRENT_JOBS,
  MAX_TRANSCRIPTION_HOURS,
} from "@indxr/shared/lib/limits"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reference/limits" },
  title: "Limits — INDXR.AI Docs",
  description:
    `The hard limits INDXR enforces: AI transcription up to ${MAX_TRANSCRIPTION_HOURS} hours per file, uploads up to ${UPLOAD_MAX_FILE_MB} MB, a 100 MB library that scales to 500 MB, playlists up to ${MAX_PLAYLIST_VIDEOS_PER_JOB} videos per job, ${MAX_CONCURRENT_JOBS} concurrent jobs, and request rate limits. Caption extraction has no length limit. There is no public REST API.`,
}

export default function DocsLimitsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Limits",
    description: metadata.description,
    url: "https://indxr.ai/docs/reference/limits",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Reference", href: "/docs" },
            { label: "Limits" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Limits</h1>
        <DefinitionLeadOpening>
          INDXR enforces a few hard limits: AI transcription up to {MAX_TRANSCRIPTION_HOURS} hours per
          file, uploads up to {UPLOAD_MAX_FILE_MB} MB, playlists up to {MAX_PLAYLIST_VIDEOS_PER_JOB} videos per job (a job
          is one transcription or playlist run), and {MAX_CONCURRENT_JOBS} jobs running at once. Caption
          extraction — pulling a video&apos;s existing subtitles — has
          no length limit, and requests are rate-limited (each account can only make so many per hour).
          There is no public REST API, the kind of programmatic interface other apps could plug into.
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
            <tr><td>AI transcription — max duration</td><td>{MAX_TRANSCRIPTION_HOURS} hours per file</td></tr>
            <tr><td>Audio/video upload — max size</td><td>{UPLOAD_MAX_FILE_MB} MB</td></tr>
            <tr><td>Upload — accepted files</td><td>{UPLOAD_EXTENSIONS.join(", ")}</td></tr>
            <tr><td>Playlist — max videos per job</td><td>{MAX_PLAYLIST_VIDEOS_PER_JOB}</td></tr>
            <tr><td>Concurrent jobs (per account)</td><td>{MAX_CONCURRENT_JOBS}</td></tr>
            <tr><td>Caption extraction — duration</td><td>No limit</td></tr>
          </tbody>
        </DocsTable>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Audio over {MAX_TRANSCRIPTION_HOURS} hours is rejected before any credits are reserved — you
          are never charged for a file the provider can&apos;t process. A playlist over{" "}
          {MAX_PLAYLIST_VIDEOS_PER_JOB} videos is rejected the same way; split it into batches of{" "}
          {MAX_PLAYLIST_VIDEOS_PER_JOB}. &ldquo;Concurrent jobs&rdquo; means how many transcriptions or
          extractions can run at the same time — you can have up to {MAX_CONCURRENT_JOBS} going at once.
        </p>

        <AnchorHeading as="h2">Library storage</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Your <strong>library</strong> — every saved transcript plus its edits, AI summaries and
          exported files — has its own storage cap. This is separate from the per-file upload size
          above: the upload cap limits a single file you send in, while this limits the total size of
          everything kept in your library. Because transcripts are text, {LIBRARY_STORAGE_BASE_MB} MB
          holds a great many of them.
        </p>
        <DocsTable>
          <thead>
            <tr>
              <th>Limit</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Library storage — base (every account)</td><td>{LIBRARY_STORAGE_BASE_MB} MB, free</td></tr>
            <tr><td>Library storage — maximum</td><td>{LIBRARY_STORAGE_MAX_MB} MB (base + bought space)</td></tr>
            <tr><td>Buy more space</td><td>+{STORAGE_BLOCK_MB} MB per {STORAGE_BLOCK_COST_CREDITS} credits, permanent — up to {STORAGE_MAX_UPGRADES} times</td></tr>
          </tbody>
        </DocsTable>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          When your library is full, a new transcript is refused <em>before</em> any credits are
          reserved — you are never charged for a transcript that could not be saved, and your existing
          transcripts are left untouched. Free up space by deleting transcripts you no longer need, or buy
          more room: {STORAGE_BLOCK_COST_CREDITS} credits adds a permanent {STORAGE_BLOCK_MB} MB, up to a{" "}
          {LIBRARY_STORAGE_MAX_MB} MB total. See{" "}
          <a className="text-[var(--accent)] hover:underline" href="/docs/account/credits#library-storage-and-buying-more">Credits</a>{" "}
          for how buying space works.
        </p>
        <DocsFigure
          src="/docs/screenshots/error-storage_full.png"
          alt="An error card headed 'Your library is full', explaining the transcript was not saved because the library is at its limit and no credits were used, with buttons to manage the library or buy space."
          caption="What you see when the library is full: the transcript is refused before any credits are spent."
        />

        <AnchorHeading as="h2">Rate limits</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A rate limit caps how many requests you can make in a set window of time, so no single user
          can overload the service. &ldquo;Per IP&rdquo; means per network address — how visitors
          without an account are counted.
        </p>
        <DocsTable>
          <thead>
            <tr>
              <th>Who</th>
              <th>Requests</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Anonymous (no account)</td><td>10 per 24 hours (per IP)</td></tr>
            <tr><td>Signed in, on the free tier</td><td>50 per hour</td></tr>
            <tr><td>Signed in, after any purchase</td><td>No limit</td></tr>
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">No public API</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          INDXR is a web app — there is no public REST API, the kind of endpoint other programs could
          call directly to automate it. Everything runs through the interface; the export formats
          (including <a className="text-[var(--accent)] hover:underline" href="/docs/reference/export-formats/json">JSON and RAG JSON</a>) are how you get the data out programmatically — that is, into your own scripts or tools.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "duration, playlist, concurrency and upload limits", verifiedAgainst: "backend/main.py (MAX_TRANSCRIPTION_SECONDS, MAX_PLAYLIST_VIDEOS, MAX_CONCURRENT_JOBS); backend/audio_utils.py (SUPPORTED_FORMATS, MAX_FILE_SIZE_MB); packages/shared/src/lib/limits.ts (TS mirror, sync-checked)" },
            { publisher: "INDXR (own code)", supports: "library storage base, maximum, buy-space ratio and full-library enforcement (ADR-078)", verifiedAgainst: "packages/shared/src/lib/storage.ts; supabase migrations 20260723140000_library_storage_limit, 20260724013956_library_storage_max_cap; backend is_library_full" },
            { publisher: "INDXR (own code)", supports: "rate limits and the after-purchase bypass", verifiedAgainst: "packages/shared/src/lib/ratelimit.ts; apps/marketing/src/app/api/extract/route.ts" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Overview", href: "/docs/how-indxr-works" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Export formats", href: "/docs/reference/export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
