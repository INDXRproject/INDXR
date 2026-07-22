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
  title: "SRT Subtitle Export — INDXR.AI Docs",
  description:
    "INDXR exports SubRip (.srt) subtitles: numbered cues with HH:MM:SS,mmm timestamps, re-segmented into readable blocks and wrapped to ~42 characters per line so they load cleanly into editors and players.",
}

// Real output of generateSrt() (packages/shared/src/utils/formatTranscript.ts). First two cues.
const srtSample = `1
00:00:00,000 --> 00:00:07,500
Welcome to this short introduction to
vector databases. A vector database stores embeddings and retrieves them by similarity.

2
00:00:07,500 --> 00:00:12,099
That makes it the backbone of most
retrieval augmented generation systems.`

export default function DocsSrtPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "SRT subtitle export",
    description: metadata.description,
    url: "https://indxr.ai/docs/reference/export-formats/srt",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/reference/export-formats" },
            { label: "SRT" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">SRT</h1>
        <DefinitionLeadOpening>
          The SRT export is a SubRip subtitle file: numbered cues, each with a{" "}
          <code>HH:MM:SS,mmm --&gt; HH:MM:SS,mmm</code> time range and the caption text. INDXR
          re-segments the raw transcript into readable cues and wraps long lines, instead of dumping raw
          caption fragments, so it loads cleanly into editors and players.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Timestamp format</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          SRT uses a <strong>comma</strong> before the milliseconds: <code>HH:MM:SS,mmm</code> (this is
          the difference from VTT, which uses a dot). Cues are numbered from 1.
        </p>

        <AnchorHeading as="h2">Re-segmentation &amp; line wrapping</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Segments are merged into cues rather than shown one raw fragment at a time. For AI
          transcription a cue closes at about 7 seconds — or at ~4 seconds if the text already ends on a
          sentence; for auto-captions a cue closes at about 3 seconds. Each cue is then wrapped to at
          most <strong>42 characters</strong> per line (a single word longer than that is left intact).
        </p>
        <DocsCodeBlock>{srtSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "Matroska / SubRip (.srt)", supports: "the SRT cue + comma-millisecond timestamp convention", href: "https://www.matroska.org/technical/subtitles.html" },
            { publisher: "INDXR (own code)", supports: "re-segmentation thresholds, 42-char line wrap", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateSrt, resegmentTranscript, wrapSubtitleText)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "VTT", href: "/docs/reference/export-formats/vtt" },
            { label: "Article: YouTube SRT download", href: "/articles/youtube-srt-download" },
          ]}
        />
      </DocsShell>
    </>
  )
}
