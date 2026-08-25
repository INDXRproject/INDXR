import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import {
  SUBTITLE_MAX_LINE,
  SUBTITLE_MAX_LINES,
  SUBTITLE_MAX_CUE_SEC,
  SUBTITLE_MIN_CUE_SEC,
  SUBTITLE_TARGET_CPS,
  SUBTITLE_CEIL_CPS,
} from "@indxr/shared/lib/subtitleConfig"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reference/export-formats/vtt" },
  title: "VTT Subtitle Export — INDXR.AI Docs",
  description:
    "INDXR exports WebVTT (.vtt) subtitles: a WEBVTT header, an optional NOTE block with title and language, and cues with HH:MM:SS.mmm timestamps — the web-native subtitle format for HTML5 video.",
}

// Real generateVtt() output — header + cues 3–4 of the fixture from video kBdfcR-8hEY ("Justice…
// Episode 01"), packages/shared/src/utils/formatTranscript.ts. Regenerated 2026-08-26; every line ≤ SUBTITLE_MAX_LINE.
const vttSample = `WEBVTT

NOTE
title: Justice: What's The Right Thing To Do? Episode 01 "THE MORAL SIDE OF MURDER"
language: en

3
00:00:33.509 --> 00:00:38.799
This is a course about Justice and we
begin with a story suppose you're the

4
00:00:38.799 --> 00:00:43.760
driver of a trolley car, and your trolley
car is hurdling down the track at sixty`

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
          when a title or language is known.
        </p>
        <AnchorHeading as="h2">Re-segmentation &amp; line wrapping</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The cue text is segmented the same way as{" "}
          <a className="text-[var(--accent)] hover:underline" href="/docs/reference/export-formats/srt">SRT</a>:
          words are packed into a cue until they would need more than{" "}
          <strong>{SUBTITLE_MAX_LINES} lines</strong> of <strong>{SUBTITLE_MAX_LINE} characters</strong>{" "}
          or run past <strong>{SUBTITLE_MAX_CUE_SEC} seconds</strong>; cues prefer to end on a sentence
          boundary; a change of speaker starts a new cue; and each cue stays on screen between{" "}
          <strong>{SUBTITLE_MIN_CUE_SEC} second</strong> and <strong>{SUBTITLE_MAX_CUE_SEC} seconds</strong> —
          lengthened toward <strong>{SUBTITLE_TARGET_CPS} characters per second</strong> by filling the
          silent gap before the next cue, and never left above <strong>{SUBTITLE_CEIL_CPS} characters per
          second</strong>.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Where a transcript has speakers, VTT carries the name as a native <code>&lt;v Name&gt;</code>{" "}
          voice tag on the first cue of each turn. That tag is zero-width on screen, so the full{" "}
          {SUBTITLE_MAX_LINE} characters stay available for spoken text — unlike SRT, which spends part
          of the line on a <code>Name: </code> prefix. Because VTT keeps the name out of the line budget
          and SRT does not, a turn-opening cue fits more spoken text in VTT, so the two files break into
          cues slightly differently.
        </p>
        <DocsCodeBlock>{vttSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "W3C", supports: "the WebVTT format (WEBVTT header, dot-millisecond timestamps, <v> voice tag)", href: "https://www.w3.org/TR/webvtt1/" },
            { publisher: "Netflix Timed Text Style Guide", supports: `the ${SUBTITLE_MAX_LINE}-char / ${SUBTITLE_MAX_LINES}-line / ${SUBTITLE_MAX_CUE_SEC}s cue conventions and reading-speed target`, href: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977" },
            { publisher: "INDXR (own code)", supports: "NOTE block, segmentation constants, <v> voice tag, line wrapping", verifiedAgainst: "packages/shared/src/lib/subtitleConfig.ts + packages/shared/src/utils/formatTranscript.ts (generateVtt, buildSubtitleCues)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "SRT", href: "/docs/reference/export-formats/srt" },
            { label: "Article: Transcript export formats", href: "/articles/transcript-export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
