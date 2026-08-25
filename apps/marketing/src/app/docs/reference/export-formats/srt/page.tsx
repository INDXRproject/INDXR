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
  alternates: { canonical: "/docs/reference/export-formats/srt" },
  title: "SRT Subtitle Export — INDXR.AI Docs",
  description:
    "INDXR exports SubRip (.srt) subtitles: numbered cues with HH:MM:SS,mmm timestamps, re-segmented into readable blocks and wrapped to 42 characters per line so they load cleanly into editors and players.",
}

// Real generateSrt() output — cues 3–4 of the fixture from video kBdfcR-8hEY ("Justice… Episode 01"),
// packages/shared/src/utils/formatTranscript.ts. Regenerated 2026-08-26; every line ≤ SUBTITLE_MAX_LINE.
const srtSample = `3
00:00:33,509 --> 00:00:38,799
This is a course about Justice and we
begin with a story suppose you're the

4
00:00:38,799 --> 00:00:43,760
driver of a trolley car, and your trolley
car is hurdling down the track at sixty`

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
          SRT — short for SubRip — is the subtitle format almost every video player and editor reads.
          An SRT export turns your transcript into timed, numbered subtitle cues you can drop straight
          into YouTube, Premiere, CapCut, DaVinci Resolve, or VLC. INDXR re-segments the transcript into
          readable cues and wraps long lines, so you get clean subtitles instead of the raw caption
          fragments most tools hand back.
        </DefinitionLeadOpening>

        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Reach for SRT when you want subtitles <em>on</em> a video — burned in during editing, or added
          as a selectable track. If you&apos;re publishing to the web instead, its sibling{" "}
          <a href="/docs/reference/export-formats/vtt" className="text-[var(--accent)] hover:underline">VTT</a>{" "}
          is the HTML5 equivalent. The rest of this page is the exact shape of the file.
        </p>

        <AnchorHeading as="h2">Timestamp format</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          SRT uses a <strong>comma</strong> before the milliseconds: <code>HH:MM:SS,mmm</code> (this is
          the difference from VTT, which uses a dot). Cues are numbered from 1.
        </p>

        <AnchorHeading as="h2">Re-segmentation &amp; line wrapping</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Segments are re-cut into cues rather than shown one raw fragment at a time. INDXR builds a
          per-word timeline, then packs words into a cue until the text would need more than{" "}
          <strong>{SUBTITLE_MAX_LINES} lines</strong> of <strong>{SUBTITLE_MAX_LINE} characters</strong>{" "}
          or the cue would run past <strong>{SUBTITLE_MAX_CUE_SEC} seconds</strong>. It prefers to end a
          cue on a sentence boundary: if a cue stopped mid-sentence but a sentence ended earlier inside
          it, the cue is cut back to that boundary, so a sentence is never split across cues unless it is
          itself too long for one. A change of speaker always starts a new cue.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Each cue is then held on screen long enough to read: at least{" "}
          <strong>{SUBTITLE_MIN_CUE_SEC} second</strong>, lengthened toward{" "}
          <strong>{SUBTITLE_TARGET_CPS} characters per second</strong> by filling the silent gap before
          the next cue (which never shifts the timeline), and never left above{" "}
          <strong>{SUBTITLE_CEIL_CPS} characters per second</strong>. A single word longer than{" "}
          {SUBTITLE_MAX_LINE} characters is left intact rather than broken.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          When a transcript has speaker labels, the name shows on the first cue of each turn. SRT has no
          speaker field, so the name is baked in as a <code>Name: </code> prefix that counts against the{" "}
          {SUBTITLE_MAX_LINE}-character line budget — unlike{" "}
          <a href="/docs/reference/export-formats/vtt" className="text-[var(--accent)] hover:underline">VTT</a>,
          which carries it out of budget as a <code>&lt;v Name&gt;</code> voice tag. Because SRT spends
          characters on the name and VTT does not, a turn-opening cue fits less spoken text in SRT than in
          VTT, so the two files break into cues slightly differently.
        </p>
        <DocsCodeBlock>{srtSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "Matroska / SubRip (.srt)", supports: "the SRT cue + comma-millisecond timestamp convention", href: "https://www.matroska.org/technical/subtitles.html" },
            { publisher: "Netflix Timed Text Style Guide", supports: `the ${SUBTITLE_MAX_LINE}-char / ${SUBTITLE_MAX_LINES}-line / ${SUBTITLE_MAX_CUE_SEC}s cue conventions and reading-speed target`, href: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977" },
            { publisher: "INDXR (own code)", supports: "segmentation constants, sentence-aware cue packing, 42-char line wrap", verifiedAgainst: "packages/shared/src/lib/subtitleConfig.ts + packages/shared/src/utils/formatTranscript.ts (generateSrt, buildSubtitleCues, wrapLines)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "VTT", href: "/docs/reference/export-formats/vtt" },
            { label: "Article: SRT generator", href: "/articles/srt-generator" },
            { label: "Article: Transcript export formats", href: "/articles/transcript-export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
