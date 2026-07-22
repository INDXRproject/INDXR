import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { DocsTable } from "@/components/docs/DocsTable"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "CSV Export — INDXR.AI Docs",
  description:
    "INDXR exports transcripts as CSV: one row per segment with segment_index, start_time, end_time, duration, word_count and text, preceded by # metadata comment lines, with a UTF-8 BOM for Excel.",
}

// Real output of generateCsv() (packages/shared/src/utils/formatTranscript.ts).
// The file begins with a UTF-8 BOM (not visible here). Rows truncated with an ellipsis.
const csvSample = `# title: Vector Databases Explained
# url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
# channel: AI Foundations
# published: 2026-06-01
# duration_seconds: 31
# language: en
# transcript_source: AI Transcription (AssemblyAI)
# extracted: 2026-07-22
segment_index,start_time,end_time,duration,word_count,text
0,0,3.4,3.4,8,"Welcome to this short introduction to vector databases."
1,3.4,7.5,4.1,10,"A vector database stores embeddings and retrieves them by similarity."
2,7.5,12.1,4.6,11,"That makes it the backbone of most retrieval augmented generation systems."`

export default function DocsCsvPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "CSV export",
    description: metadata.description,
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/csv",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "CSV" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">CSV</h1>
        <DefinitionLeadOpening>
          The CSV export is one row per transcript segment — <code>segment_index</code>,{" "}
          <code>start_time</code>, <code>end_time</code>, <code>duration</code>,{" "}
          <code>word_count</code> and <code>text</code> — preceded by <code>#</code> metadata comment
          lines, with a UTF-8 byte-order mark so Excel opens it correctly. It is made for spreadsheets
          and text analysis.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Columns</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Column</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>segment_index</code></td><td>0-based position of the segment</td></tr>
            <tr><td><code>start_time</code></td><td>Segment start, in seconds</td></tr>
            <tr><td><code>end_time</code></td><td>Start of the next segment (or clip end for the last)</td></tr>
            <tr><td><code>duration</code></td><td>Segment duration, in seconds</td></tr>
            <tr><td><code>word_count</code></td><td>Words in the segment text</td></tr>
            <tr><td><code>text</code></td><td>The segment text (quoted; internal quotes doubled)</td></tr>
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">Output</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The <code>#</code> lines at the top carry the video&apos;s metadata; they are comments, not
          data rows. Video metadata is <strong>not</strong> repeated per row.
        </p>
        <DocsCodeBlock>{csvSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "column names, metadata comment lines, BOM", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateCsv)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "JSON / RAG JSON", href: "/docs/how-indxr-works/export-formats/json" },
            { label: "Article: YouTube transcript to CSV", href: "/articles/youtube-transcript-csv" },
          ]}
        />
      </DocsShell>
    </>
  )
}
