import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsTable } from "@/components/docs/DocsTable"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"

const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export const metadata: Metadata = {
  title: "Export Formats — INDXR.AI Docs",
  description:
    "INDXR exports every transcript in seven formats — plain text, Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON. This page explains what each one is for; each format has its own spec page.",
}

export default function DocsExportFormatsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Export Formats",
    description:
      "INDXR exports every transcript in seven formats — plain text, Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON. What each one is for, and links to each format spec.",
    url: "https://indxr.ai/docs/reference/export-formats",
  }

  const linkClass = "text-[var(--accent)] hover:underline"

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Reference", href: "/docs" },
            { label: "Export formats" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Export formats</h1>
        <DefinitionLeadOpening>
          Every transcript downloads in seven formats. The right one depends on what you&apos;ll do
          next — read it, drop it in a note app, load it into a spreadsheet, add subtitles to a video,
          or feed it to code. Six are free and unlimited; only RAG JSON uses credits. Here&apos;s what
          each one is for; every format has its own page with the exact fields and a real sample.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Which format to pick</AnchorHeading>

        <div className="space-y-4 text-[var(--fg-subtle)] leading-relaxed">
          <p>
            <strong>Plain text (TXT)</strong> — just the words, in readable paragraphs. Reach for it to
            read the transcript or paste it into a document. It carries no timing, so it&apos;s not for
            subtitles. <Link className={linkClass} href="/docs/reference/export-formats/txt">Read more →</Link>
          </p>
          <p>
            <strong>Markdown</strong> — the text with a metadata header and optional clickable
            timestamp headings. Best for note apps like Obsidian or Notion, where it drops in and stays
            linked to the video. The header only shows as fields in an app that reads Markdown
            frontmatter. <Link className={linkClass} href="/docs/reference/export-formats/markdown">Read more →</Link>
          </p>
          <p>
            <strong>CSV</strong> — one row per segment, with start and end times and word counts. Made
            for spreadsheets and text analysis. It&apos;s data, not something you&apos;d read top to
            bottom. <Link className={linkClass} href="/docs/reference/export-formats/csv">Read more →</Link>
          </p>
          <p>
            <strong>SRT</strong> — SubRip, the subtitle format almost every editor and player reads.
            Use it to add captions to a video. Its timestamps use a comma before the milliseconds —
            close to VTT but not interchangeable. <Link className={linkClass} href="/docs/reference/export-formats/srt">Read more →</Link>
          </p>
          <p>
            <strong>VTT</strong> — WebVTT, the subtitle format built for web video (the HTML5{" "}
            <code>&lt;track&gt;</code> element). Use it for players on a web page. It looks like SRT but
            uses a dot before the milliseconds, so don&apos;t swap one file for the other. <Link className={linkClass} href="/docs/reference/export-formats/vtt">Read more →</Link>
          </p>
          <p>
            <strong>JSON</strong> — the raw segments as structured data you can parse in code. Use it
            when you&apos;re building your own processing. This is the free, standard JSON — not the RAG
            one below. <Link className={linkClass} href="/docs/reference/export-formats/json">Read more →</Link>
          </p>
          <p>
            <strong>RAG JSON</strong> — the transcript pre-split into overlapping chunks with deep
            links, ready for a vector database (the store behind retrieval-augmented generation). Use it
            when you&apos;re embedding transcripts for AI search. It&apos;s the one export that costs
            credits. <Link className={linkClass} href="/docs/reference/export-formats/json">Read more →</Link>
          </p>
        </div>

        <AnchorHeading as="h2">Quick comparison</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Format</th>
              <th>File</th>
              <th>Without account</th>
              <th>Cost</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Plain text</td><td>.txt</td><td>Yes</td><td>Free</td><td>Reading, quick copy</td></tr>
            <tr><td>Markdown</td><td>.md</td><td>No</td><td>Free</td><td>Obsidian, Notion, blogs</td></tr>
            <tr><td>CSV</td><td>.csv</td><td>No</td><td>Free</td><td>Spreadsheets, analysis</td></tr>
            <tr><td>SRT</td><td>.srt</td><td>No</td><td>Free</td><td>Subtitles (editors, players)</td></tr>
            <tr><td>VTT</td><td>.vtt</td><td>No</td><td>Free</td><td>Web video (HTML5)</td></tr>
            <tr><td>JSON</td><td>.json</td><td>No</td><td>Free</td><td>Your own processing</td></tr>
            <tr><td>RAG JSON</td><td>.json</td><td>No</td><td>{ragPer10} credit / 10 min</td><td>Vector databases, RAG</td></tr>
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">Cost and access</AnchorHeading>
        <ul className="list-disc pl-5 space-y-1 text-[var(--fg-subtle)]">
          <li>Every format works for both caption extraction and AI transcription.</li>
          <li>Plain text is the only format you can download without an account; the rest need a free account.</li>
          <li>Only <strong>RAG JSON</strong> uses credits ({ragPer10} credit per 10 minutes of transcript); re-downloading one you already exported is free.</li>
        </ul>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "the seven formats and their serializers", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts" },
            { publisher: "INDXR (own code)", supports: "RAG JSON cost, plain-text-only for anonymous", verifiedAgainst: "packages/shared/src/lib/pricing.ts (RAG_JSON_PER_10MIN); packages/shared/src/components/TranscriptCard.tsx:122-133" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Credits", href: "/docs/account/credits" },
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Article: YouTube to text", href: "/articles/youtube-to-text" },
          ]}
        />
      </DocsShell>
    </>
  )
}
