import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"

const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export const metadata: Metadata = {
  title: "JSON & RAG JSON Export — INDXR.AI Docs",
  description:
    "INDXR exports transcripts as standard JSON (raw segments with a metadata wrapper, free) and RAG-optimized JSON (chunked, with token estimates and per-chunk deep links for vector databases).",
}

// Real output of buildRagJson(..., { chunkSize: 15 }) — packages/shared/src/utils/formatTranscript.ts.
const ragSample = `{
  "metadata": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Vector Databases Explained",
    "duration_seconds": 31,
    "extracted_at": "2026-07-22T15:42:22.508Z",
    "chunking_config": {
      "chunk_size_seconds": 15,
      "overlap_seconds": 2,
      "overlap_strategy": "sentence_boundary",
      "total_chunks": 2
    },
    "channel": "AI Foundations",
    "language": "en",
    "published_at": "2026-06-01",
    "extraction_method": "assemblyai"
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "dQw4w9WgXcQ_chunk_000",
      "text": "Welcome to this short introduction to vector databases. … In this video we compare three popular options.",
      "start_time": 0,
      "end_time": 15.1,
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=0",
      "token_count_estimate": 49,
      "metadata": {
        "video_id": "dQw4w9WgXcQ",
        "title": "Vector Databases Explained",
        "channel": "AI Foundations",
        "chunk_index": 0,
        "start_time": 0,
        "end_time": 15.1,
        "language": "en",
        "total_chunks": 2
      }
    },
    {
      "chunk_index": 1,
      "chunk_id": "dQw4w9WgXcQ_chunk_001",
      "text": "In this video we compare three popular options. … By the end you will know which one fits your pipeline.",
      "start_time": 12.1,
      "end_time": 30.7,
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=12",
      "token_count_estimate": 59,
      "metadata": { "…": "same shape as chunk 0" }
    }
  ]
}`

export default function DocsJsonPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "JSON and RAG JSON export",
    description: metadata.description,
    url: "https://indxr.ai/docs/reference/export-formats/json",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/reference/export-formats" },
            { label: "JSON / RAG JSON" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">JSON &amp; RAG JSON</h1>
        <DefinitionLeadOpening>
          INDXR exports two kinds of JSON: <strong>standard JSON</strong> — the raw segments with a
          metadata wrapper, free — and <strong>RAG JSON</strong> — the transcript already chunked, with
          token estimates and a per-chunk deep link, ready to embed in a vector database.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Standard JSON (free)</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The raw segments as they are — each with its <code>text</code>, start and duration — inside a
          metadata wrapper (video id, title, channel, language). Take this when you want to handle the
          chunking and indexing yourself. It costs nothing and adds no credit charge on top of
          extraction.
        </p>

        <AnchorHeading as="h2">RAG JSON (chunked)</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          RAG JSON merges the segments into overlapping chunks and adds everything a retrieval pipeline
          needs. The top-level <code>metadata.chunking_config</code> records the chunk size, the overlap
          (about 15% of the chunk size), the overlap strategy, and the total chunk count.
        </p>

        <AnchorHeading as="h3">Chunk fields</AnchorHeading>
        <ul className="list-disc pl-5 space-y-1 text-[var(--fg-subtle)]">
          <li><code>chunk_index</code> / <code>chunk_id</code> — position and a stable id (<code>&lt;video_id&gt;_chunk_000</code>)</li>
          <li><code>text</code> — the chunk text (including the overlap carried from the previous chunk)</li>
          <li><code>start_time</code> / <code>end_time</code> — the chunk&apos;s time range in seconds</li>
          <li><code>deep_link</code> — <code>https://youtu.be/&lt;id&gt;?t=N</code>, jumps to the chunk&apos;s start</li>
          <li><code>token_count_estimate</code> — words × 1.33</li>
          <li><code>metadata</code> — video id, title, channel, language, chunk index, total chunks, time range</li>
        </ul>

        <AnchorHeading as="h3">Overlap strategy</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          For AI transcription the overlap snaps to whole sentences (<code>overlap_strategy: sentence_boundary</code>); for
          auto-captions it snaps to whole segments (<code>segment_boundary</code>). In the example below the
          sentence &quot;In this video we compare three popular options.&quot; ends chunk 0 and opens
          chunk 1 — that is the overlap.
        </p>

        <AnchorHeading as="h3">Chunk size presets</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You choose the target chunk length when you export — 30, 60, 90 or 120 seconds. Sixty
          seconds is the default. Shorter chunks are tighter and better for pulling exact quotes;
          longer chunks keep more surrounding context per vector. Your preferred size is remembered in{" "}
          <a className="text-[var(--accent)] hover:underline" href="/docs/account/settings">Settings</a>.
        </p>
        <DocsTable>
          <thead>
            <tr>
              <th>Preset</th>
              <th>Chunk length</th>
              <th>Approx. tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Quote</td><td>30s</td><td>~100 tokens</td></tr>
            <tr><td>Balanced (default)</td><td>60s</td><td>~200 tokens</td></tr>
            <tr><td>Precise</td><td>90s</td><td>~300 tokens</td></tr>
            <tr><td>Context</td><td>120s</td><td>~390 tokens</td></tr>
          </tbody>
        </DocsTable>

        <DocsCallout variant="costs-credits">
          RAG JSON costs {ragPer10} credit per 10 minutes of transcript (minimum 1). Standard JSON and
          the other formats are free. Re-downloading a transcript you already exported to RAG JSON is
          free.
        </DocsCallout>

        <DocsCodeBlock>{ragSample}</DocsCodeBlock>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "RAG JSON schema, chunking, overlap, deep links, token estimate", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (buildRagJson, buildRagChunks)" },
            { publisher: "INDXR (own code)", supports: "chunk-size presets (30/60/90/120s, default 60) and token estimates", verifiedAgainst: "apps/app/src/components/library/RagExportView.tsx + dashboard/settings/DeveloperExportsCard.tsx (CHUNK_OPTIONS)" },
            { publisher: "LangChain / Pinecone / ChromaDB / Weaviate / Qdrant", supports: "the vector databases the chunk shape targets", href: "https://python.langchain.com/docs/how_to/document_loader_json/" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Article: YouTube transcript JSON", href: "/articles/youtube-transcript-json" },
            { label: "Article: YouTube transcripts for RAG", href: "/articles/youtube-transcript-for-rag" },
          ]}
        />
      </DocsShell>
    </>
  )
}
