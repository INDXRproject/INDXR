import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import {
  spellCount,
  EXPORT_FORMAT_COUNT,
  EXPORT_DOWNLOAD_COUNT,
} from "@indxr/shared/lib/exportFormats"
import { CREDIT_COSTS, FREE_TIER, RAG_CHUNK_PRESETS } from "@indxr/shared/lib/pricing"
import { SUBTITLE_MAX_LINE, SUBTITLE_MAX_LINES, SUBTITLE_MAX_CUE_SEC } from "@indxr/shared/lib/subtitleConfig"

const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export const metadata: Metadata = {
  alternates: { canonical: "/articles/transcript-export-formats" },
  title: "Transcript export formats: which file to choose | INDXR.AI",
  description:
    "One transcript, several files: plain text, Markdown, CSV, SRT and VTT subtitles, standard JSON, and RAG JSON. A decision table plus a real example of each, so you can pick the right one.",
  ...editorialOg("transcript-export-formats"),
}

const faqs = [
  {
    q: "Do I need an account to export?",
    a: `Only for everything except plain text. A TXT download works with no account. Every other format needs a free account, which comes with ${welcomeCredits} credits. It is a sign-in wall on the richer formats, not a paywall.`,
  },
  {
    q: "Which formats are free?",
    a: `All of them except RAG JSON. Plain text, Markdown, CSV, SRT, VTT and standard JSON cost no credits once the transcript exists. RAG JSON is the one paid export.`,
  },
  {
    q: "What does RAG JSON cost?",
    a: `${ragPer10} credit per 10 minutes of video, rounded up, minimum 1. Re-downloading a transcript you have already exported to RAG JSON is free, and credits never expire. There are no free RAG exports; the credit is charged the first time.`,
  },
  {
    q: "Can I export a whole playlist at once?",
    a: `Yes. Select the transcripts in your library and download them together. You get a ZIP with one file per video in the format you chose, not a single merged file.`,
  },
  {
    q: "What is the difference between standard JSON and RAG JSON?",
    a: `Standard JSON is the raw segments with a metadata wrapper, free. RAG JSON merges the segments into larger chunks and adds per-chunk deep links, token estimates and flat metadata for a vector database. Standard JSON is a data format; RAG JSON is a pipeline-ready input.`,
  },
  {
    q: "Which format should I use for Obsidian or Notion?",
    a: `Markdown. It carries a YAML frontmatter block that Obsidian reads as Properties, and Notion imports the headings as a page outline. Use the timestamps variant if you want each section to link back to the video.`,
  },
]

const sources = [
  {
    label: "Netflix Timed Text Style Guide: General Requirements",
    url: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements",
  },
  {
    label: "Vectara NAACL 2025 — Chunking strategy benchmark (25 configs × 48 embedding models)",
    url: "https://arxiv.org/abs/2410.13070",
  },
  {
    label: "NVIDIA Technical Blog — Finding the Best Chunking Strategy for Accurate AI Responses",
    url: "https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses",
  },
]

// Every fragment below is verbatim generator output from ONE stored transcript, Justice
// kBdfcR-8hEY ("… Episode 01", 1142 segments, auto-captions), run through the generators in
// packages/shared/src/utils/formatTranscript.ts. Long text and the title are truncated with an
// ellipsis; nothing is otherwise altered. The MD/SRT fragments are the fixture files in
// apps/video/export-demos/fixture/; TXT/CSV/JSON were regenerated from the same segments.

const txtSample = `Funding for this program is provided by: Additional funding provided by

This is a course about Justice and we begin
with a story suppose you're the driver of a trolley car, and your trolley car is hurdling down
the track at sixty miles an hour`

const mdSample = `---
title: "Justice: What's The Right Thing To Do? Episode 01 …"
url: "https://www.youtube.com/watch?v=kBdfcR-8hEY"
duration: 3296
language: "en"
transcript_source: "YouTube captions"
created: "2026-08-07"
type: youtube
tags: [youtube, transcript]
---

# Justice: What's The Right Thing To Do? Episode 01 …

## [00:00:04](https://youtu.be/kBdfcR-8hEY?t=4)
Funding for this program is provided by: Additional funding provided by`

const srtSample = `1
00:00:04,200 --> 00:00:10,723
Funding for this program is provided by:
Additional

2
00:00:10,723 --> 00:00:15,240
funding provided by`

const csvSample = `# title: Justice: What's The Right Thing To Do? Episode 01 …
# url: https://www.youtube.com/watch?v=kBdfcR-8hEY
# duration_seconds: 3296
# language: en
# transcript_source: YouTube captions
# extracted: 2026-08-07
segment_index,start_time,end_time,duration,word_count,text
0,4.2,8.24,4.04,7,"Funding for this program is provided by:"
1,8.24,33.51,7,4,"Additional funding provided by"`

const jsonSample = `{
  "metadata": {
    "video_id": "kBdfcR-8hEY",
    "title": "Justice: What's The Right Thing To Do? Episode 01 …",
    "duration_seconds": 3296,
    "extracted_at": "2026-08-07T15:18:48.032Z",
    "language": "en",
    "extraction_method": "youtube_captions"
  },
  "segments": [
    { "text": "Funding for this program is provided by:", "start_time": 4.2, "end_time": 8.24 },
    { "text": "Additional funding provided by", "start_time": 8.24, "end_time": 33.51 }
  ]
}`

const ragSample = `{
  "metadata": {
    "video_id": "kBdfcR-8hEY",
    "duration_seconds": 3296,
    "language": "en",
    "extraction_method": "youtube_captions",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "segment_boundary",
      "total_chunks": 60
    }
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "kBdfcR-8hEY_chunk_000",
      "text": "Funding for this program is provided by: Additional funding provided by This is a course about Justice and we begin with a story suppose you're the driver of a trolley car …",
      "start_time": 4.2,
      "end_time": 65.08,
      "deep_link": "https://youtu.be/kBdfcR-8hEY?t=4",
      "token_count_estimate": 128,
      "metadata": { "…": "flat, per-chunk: video id, title, channel, timestamps, language, total_chunks" }
    }
  ]
}`

export default function TranscriptExportFormatsPage() {
  return (
    <ToolPageTemplate
      category="Export Formats"
      slug="transcript-export-formats"
      title="Transcript export formats: which file to choose"
      metaDescription="One transcript, several files: plain text, Markdown, CSV, SRT and VTT subtitles, standard JSON, and RAG JSON. A decision table plus a real example of each, so you can pick the right one."
      publishedAt="2026-04-16"
      updatedAt="2026-08-27"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        You have a transcript, and now you have to decide which file to take it away in. The words are
        the same in every one; what changes is the wrapping, and the wrapping is what makes a file
        useful in a notes app, a spreadsheet, a video editor or a vector database. This page is the
        short version: a table to choose from, then one real example of each format with a link to its
        reference page for the exact fields.
      </p>

      <p>
        You pick a video once. From that single extraction the transcript exports as{" "}
        {spellCount(EXPORT_FORMAT_COUNT)} formats, or {spellCount(EXPORT_DOWNLOAD_COUNT)} downloads if
        you count the timestamped variants of plain text and Markdown as their own option. Everything
        is free except RAG JSON, and only plain text can be downloaded without an account.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          See pricing →
        </Link>
      </div>

      <h2>Pick a format</h2>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>{"What it's for"}</th>
              <th>Cost</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Plain text (TXT)</td>
              <td>Read a video like a document, or start your own writing from it</td>
              <td>Free</td>
              <td>Not needed</td>
            </tr>
            <tr>
              <td>Markdown</td>
              <td>Notes apps: Obsidian, Notion, Logseq. Frontmatter in the header</td>
              <td>Free</td>
              <td>Free account</td>
            </tr>
            <tr>
              <td>SRT</td>
              <td>Subtitles for a video editor: Premiere, DaVinci Resolve, CapCut</td>
              <td>Free</td>
              <td>Free account</td>
            </tr>
            <tr>
              <td>VTT</td>
              <td>Subtitles for the web and course platforms: Canvas, Moodle</td>
              <td>Free</td>
              <td>Free account</td>
            </tr>
            <tr>
              <td>CSV</td>
              <td>One row per segment, for analysis in a spreadsheet or script</td>
              <td>Free</td>
              <td>Free account</td>
            </tr>
            <tr>
              <td>JSON</td>
              <td>Segments with timestamps and a metadata wrapper, for developers</td>
              <td>Free</td>
              <td>Free account</td>
            </tr>
            <tr>
              <td>RAG JSON</td>
              <td>Chunked, with deep links and token estimates, for a vector database</td>
              <td>{ragPer10} credit / 10 min</td>
              <td>Free account</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Plain text and Markdown each come in two shapes, plain and with timestamps, which is why{" "}
        {spellCount(EXPORT_FORMAT_COUNT)} formats add up to {spellCount(EXPORT_DOWNLOAD_COUNT)} download
        options in the export menu. The rest of this page takes each format in turn.
      </p>

      <h2>Plain text (TXT)</h2>

      <p>
        Choose plain text to read a video through, or to hand the words to an AI tool without any
        markup in the way. INDXR groups the raw caption fragments into paragraphs on the natural pauses
        in speech, so it reads like a document rather than a wall of two-second lines. There is also a
        variant with a timestamp on every line, for when you need to point at the exact moment
        something was said. It is the one format you can download without an account.
      </p>

      <DocsCodeBlock>{txtSample}</DocsCodeBlock>

      <p>
        The full field-by-field behaviour is on the{" "}
        <Link href="/docs/reference/export-formats/txt">plain text reference page</Link>.
      </p>

      <h2>Markdown</h2>

      <p>
        Choose Markdown for a notes app. The file opens with a YAML frontmatter block that Obsidian
        reads as Properties and drops straight into a vault; Notion imports the headings as a page
        outline. Fields the video does not carry, like a channel or a publish date, are left out rather
        than filled with blanks. The timestamps variant adds a clickable{" "}
        <code>## [HH:MM:SS]</code> heading per section that links back to that second of the video.
      </p>

      <DocsCodeBlock>{mdSample}</DocsCodeBlock>

      <p>
        The frontmatter keys and the heading format are on the{" "}
        <Link href="/docs/reference/export-formats/markdown">Markdown reference page</Link>. For the
        full note-taking workflow, from summary to vault, see{" "}
        <Link href="/articles/youtube-to-notes">YouTube to notes</Link>.
      </p>

      <h2>SRT and VTT subtitles</h2>

      <p>
        Choose SRT for a desktop video editor and VTT for a web player or a course platform. Both carry
        the same cues; SRT writes the time with a comma and VTT opens with a <code>WEBVTT</code> header
        that also holds the title and language. INDXR rebuilds the transcript into readable subtitle
        blocks rather than copying the raw fragments across, so no line runs past {SUBTITLE_MAX_LINE}{" "}
        characters, no block carries more than {SUBTITLE_MAX_LINES} lines, and none stays on screen
        longer than {SUBTITLE_MAX_CUE_SEC} seconds, following the{" "}
        <a
          href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements"
          target="_blank"
          rel="noopener noreferrer"
        >
          Netflix timed-text guideline
        </a>{" "}
        that most of the industry works to.
      </p>

      <DocsCodeBlock>{srtSample}</DocsCodeBlock>

      <DocsFigure
        src="/docs/screenshots/video-subtitles-srt.png"
        alt="An exported SRT subtitle file: numbered cues, each with a start and end timestamp and one or two short lines of text."
        caption="An exported SRT file: numbered cues, timestamps, and lines rebuilt to subtitle length rather than raw transcript fragments."
      />

      <p>
        The exact timing format for each is on the{" "}
        <Link href="/docs/reference/export-formats/srt">SRT reference page</Link> and the{" "}
        <Link href="/docs/reference/export-formats/vtt">VTT reference page</Link>. For how the blocks
        are built, and how to make subtitles from an audio file with no video, see the{" "}
        <Link href="/articles/srt-generator">SRT generator</Link>.
      </p>

      <h2>CSV</h2>

      <p>
        Choose CSV to work with the transcript as data: one row per segment, ready for a spreadsheet or
        a script. Each row carries the segment index, its start and end time, its duration, a word
        count and the text. The <code>end_time</code> of a row is the start of the next segment, so the
        rows join up with no gaps. A short block of comment lines at the top records the video title,
        URL, duration, language and source, and the file is written with a UTF-8 byte-order mark so
        Excel opens non-Latin scripts without garbling them.
      </p>

      <DocsCodeBlock>{csvSample}</DocsCodeBlock>

      <p>
        The full column list is on the{" "}
        <Link href="/docs/reference/export-formats/csv">CSV reference page</Link>.
      </p>

      <h2>JSON</h2>

      <p>
        Choose standard JSON when code will read the transcript. It is a metadata wrapper around the
        segments: each segment has its text, a <code>start_time</code> and an <code>end_time</code>,
        and the wrapper carries the video id, title, duration and, when the source is a YouTube video,
        the channel, language and publish date. It is free for any captioned video.
      </p>

      <DocsCodeBlock>{jsonSample}</DocsCodeBlock>

      <p>
        The full schema, including what a diarised transcript adds, is on the{" "}
        <Link href="/docs/reference/export-formats/json">JSON reference page</Link>.
      </p>

      <h2>RAG JSON</h2>

      <p>
        Choose RAG JSON when the transcript is going into a vector database. It is the one export with
        choices in it, and the one that costs credits. Where standard JSON hands you the raw two to
        five second segments, RAG JSON merges them into larger chunks sized for an embedding model,
        which works best on a few hundred tokens of coherent text rather than a stream of short
        fragments (
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
          Vectara NAACL 2025
        </a>
        ,{" "}
        <a
          href="https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses"
          target="_blank"
          rel="noopener noreferrer"
        >
          NVIDIA
        </a>
        ).
      </p>

      <p>
        Each chunk carries what the other formats do not: a <code>chunk_id</code>, a{" "}
        <code>deep_link</code> that opens the video at the second the chunk starts, a{" "}
        <code>token_count_estimate</code>, and a flat block of metadata that loads into a vector
        database without reshaping. The file also records the chunk size, the overlap and the total
        chunk count in its <code>chunking_config</code>.
      </p>

      <DocsCodeBlock>{ragSample}</DocsCodeBlock>

      <p>You choose the chunk length when you export:</p>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Preset</th>
              <th>Length</th>
              <th>Approx. tokens</th>
            </tr>
          </thead>
          <tbody>
            {RAG_CHUNK_PRESETS.map((p) => (
              <tr key={p.value}>
                <td>{p.label}{p.value === 60 ? " (default)" : ""}</td>
                <td>{p.sub}</td>
                <td>{p.tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        RAG JSON costs {ragPer10} credit per 10 minutes of video, rounded up, minimum 1. Re-downloading
        a transcript you have already exported to RAG JSON is free, and credits never expire. There are
        no free RAG exports: the credit is charged the first time you export a given transcript. The
        schema and the field-by-field detail are on the{" "}
        <Link href="/docs/reference/export-formats/json">JSON reference page</Link>. For choosing a
        chunk size, see{" "}
        <Link href="/articles/chunk-youtube-transcripts-for-rag">
          how to chunk YouTube transcripts for RAG
        </Link>
        ; for loading the chunks into a store, see{" "}
        <Link href="/articles/youtube-transcripts-vector-database">
          YouTube transcripts in a vector database
        </Link>
        ; and for building a searchable base from a whole channel, see{" "}
        <Link href="/articles/youtube-channel-knowledge-base">a YouTube channel knowledge base</Link>.
      </p>

      <h2>Exporting a whole library at once</h2>

      <p>
        Every format is available in bulk. In your library, select the transcripts you want, pick a
        format, and download them together. You get a ZIP with one file per video, each named after
        its video, in the format you chose. It is separate files bundled together, not a single merged
        document, so a folder of Markdown notes stays a folder of notes and a set of subtitle files
        stays one file per video.
      </p>

      <p>
        Playlists feed this directly: the{" "}
        <Link href="/articles/youtube-playlist-transcript">Playlist tab</Link> processes every selected
        video in one job, and the results land in your library ready to select and export as a batch.
      </p>

      <h2>Getting started</h2>

      <p>
        Everything you extract is saved to your library and stays there to re-export in any format
        whenever you need it. A free account includes {welcomeCredits} credits and takes a minute to
        make, with no card. For credit packages, see the <Link href="/pricing">pricing page</Link>; for
        the whole extraction pipeline end to end, see{" "}
        <Link href="/docs/how-indxr-works">how INDXR.AI works</Link>.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          See pricing →
        </Link>
      </div>
    </ToolPageTemplate>
  )
}
