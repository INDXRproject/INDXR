import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reference/export-formats/vtt" },
  title: "VTT Subtitle Export — INDXR.AI Docs",
  description:
    "INDXR exports WebVTT (.vtt) subtitles: a WEBVTT header, an optional NOTE block with title and language, and cues with HH:MM:SS.mmm timestamps — the web-native subtitle format for HTML5 video.",
}

// Real output of generateVtt() (packages/shared/src/utils/formatTranscript.ts). Header + first two cues.
const vttSample = `WEBVTT

NOTE
title: Vector Databases Explained
language: en

1
00:00:00.000 --> 00:00:07.500
Welcome to this short introduction to
vector databases. A vector database stores embeddings and retrieves them by similarity.

2
00:00:07.500 --> 00:00:12.099
That makes it the backbone of most
retrieval augmented generation systems.`

export default function DocsVttPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "VTT subtitle export",
    description: metadata.description,
    url: "https://indxr.ai/docs/reference/export-formats/vtt",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/reference/export-formats" },
            { label: "VTT" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">VTT</h1>
        <DefinitionLeadOpening>
          VTT is the web-native subtitle format — it&apos;s what an HTML5 video player loads for
          on-screen captions through a <code>&lt;track&gt;</code> element. Reach for it when your video
          plays in a browser; for a desktop editor, SRT is the sibling to use. The file starts with a
          required <code>WEBVTT</code> header, an optional <code>NOTE</code> block carrying the title and
          language, then numbered cues with <code>HH:MM:SS.mmm</code> time ranges — a dot before the
          milliseconds, unlike SRT&apos;s comma.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Timestamp format &amp; header</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          VTT uses a <strong>dot</strong> before the milliseconds: <code>HH:MM:SS.mmm</code> (SRT uses a
          comma). The file always opens with <code>WEBVTT</code>; the <code>NOTE</code> block is added
          when a title or language is known. Cue text uses the same re-segmentation — breaking the
          transcript into short, subtitle-sized cues — and ~42-character line wrapping as <a className="text-[var(--accent)] hover:underline" href="/docs/reference/export-formats/srt">SRT</a>.
        </p>
        <DocsCodeBlock>{vttSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "W3C", supports: "the WebVTT format (WEBVTT header, dot-millisecond timestamps)", href: "https://www.w3.org/TR/webvtt1/" },
            { publisher: "INDXR (own code)", supports: "NOTE block, re-segmentation, line wrapping", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateVtt, resegmentTranscript)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "SRT", href: "/docs/reference/export-formats/srt" },
            { label: "Article: YouTube SRT download", href: "/articles/youtube-srt-download" },
          ]}
        />
      </DocsShell>
    </>
  )
}
