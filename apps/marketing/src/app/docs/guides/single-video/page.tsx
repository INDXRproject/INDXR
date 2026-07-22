import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export const metadata: Metadata = {
  title: "Transcribe a single video — INDXR.AI Docs",
  description:
    "Paste one YouTube link and get its transcript. INDXR pulls the video's captions in seconds — no account needed for plain text — and can transcribe the audio with AI when a video has no captions.",
  robots: { index: true, follow: true },
}

export default function DocsSingleVideoPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Transcribe a single video",
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/single-video",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Single video" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Single video</h1>
        <DefinitionLeadOpening>
          The single-video tab turns one YouTube link into a transcript. Paste the URL and INDXR reads
          the captions YouTube already has — the text track that plays as subtitles — usually in a
          couple of seconds. This is the fastest way in, and for a captioned video it is free and needs
          no account. When a video has no captions, you can switch on AI transcription instead.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Paste a link and extract</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Extraction takes three steps and no setup.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-[var(--fg-subtle)] leading-relaxed">
          <li>Paste a single video URL into the box. A whole-channel URL is not accepted — INDXR works on videos and playlists, so make a playlist and paste that instead.</li>
          <li>INDXR fetches the captions and groups the raw fragments into readable paragraphs.</li>
          <li>Read it on the page, or download it — see the <a className="text-[var(--accent)] hover:underline" href="/docs/reference/export-formats">export formats</a>.</li>
        </ol>

        <AnchorHeading as="h2">No captions? Switch on AI transcription</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Not every video has captions. When none are found, signed-in users can turn on <strong>AI
          transcription</strong> — INDXR downloads the audio and transcribes it with a speech-to-text
          model.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Auto-caption extraction stays free; AI transcription costs {perMin} credit per minute of
          audio (rounded up, minimum 1). The toggle only appears once you are logged in.
        </p>

        <AnchorHeading as="h2">Restricted or unavailable videos</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Some videos can&apos;t be read, and INDXR tells you which case you hit rather than failing
          silently.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[var(--fg-subtle)] leading-relaxed">
          <li><strong>Members-only</strong> — locked behind a channel membership; INDXR can&apos;t access it.</li>
          <li><strong>Age-restricted</strong> — needs a signed-in YouTube account to watch; AI transcription can&apos;t work around this either.</li>
          <li><strong>Removed, private, or geo-blocked</strong> — the video is unavailable. If you have the file, an <a className="text-[var(--accent)] hover:underline" href="/docs/guides/uploads">upload</a> is the way in.</li>
        </ul>

        <AnchorHeading as="h2">What you get without an account</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can extract a captioned video and download it as plain text (TXT) without signing in. The
          other formats — Markdown, CSV, SRT, VTT, JSON — and AI transcription need a free account.
        </p>
        <DocsCallout variant="requires-account">
          A free account also adds {FREE_TIER.WELCOME_CREDITS} welcome credits for testing AI
          transcription and a personal library that saves every transcript.
        </DocsCallout>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "caption extraction, anonymous access, members-only handling", verifiedAgainst: "apps/marketing/src/app/api/extract/route.ts (route.ts:20-21, 96-100); backend/main.py:296-297" },
            { publisher: "INDXR (own code)", supports: "AI-transcription toggle (signed-in only), 1 credit/min, restricted-video messages", verifiedAgainst: "packages/shared/src/components/free-tool/VideoTab.tsx (VideoTab.tsx:1016,1059,212-218,614-615)" },
            { publisher: "INDXR (own code)", supports: "channel-URL rejection, plain-text-only for anonymous", verifiedAgainst: "packages/shared/src/utils/youtube.ts (youtube.ts:22,36); packages/shared/src/components/TranscriptCard.tsx (TranscriptCard.tsx:122-133,418)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Playlists", href: "/docs/guides/playlists" },
            { label: "Article: YouTube to text", href: "/articles/youtube-to-text" },
          ]}
        />
      </DocsShell>
    </>
  )
}
