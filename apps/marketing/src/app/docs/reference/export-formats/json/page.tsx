import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, RAG_CHUNK_PRESETS } from "@indxr/shared/lib/pricing"

const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reference/export-formats/json" },
  title: "JSON & RAG JSON Export — INDXR.AI Docs",
  description:
    "INDXR exports transcripts as standard JSON (raw segments with a metadata wrapper, free) and RAG-optimized JSON (chunked, with token estimates and per-chunk deep links for vector databases).",
}

// Real output of the shared generators (packages/shared/src/utils/formatTranscript.ts —
// generateJson, buildRagJson) from the stored transcript kBdfcR-8hEY ("Justice… Episode 01",
// auto-captions). Title and chunk text truncated with an ellipsis.
const stdSample = `{
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
    "title": "Justice: What's The Right Thing To Do? Episode 01 …",
    "duration_seconds": 3296,
    "extracted_at": "2026-08-07T15:18:48.032Z",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "segment_boundary",
      "total_chunks": 60
    },
    "language": "en",
    "extraction_method": "youtube_captions"
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "kBdfcR-8hEY_chunk_000",
      "text": "Funding for this program is provided by: Additional funding provided by This is a course about Justice … they will all die let's assume you know that for sure",
      "start_time": 4.2,
      "end_time": 65.08,
      "deep_link": "https://youtu.be/kBdfcR-8hEY?t=4",
      "token_count_estimate": 128,
      "metadata": {
        "video_id": "kBdfcR-8hEY",
        "title": "Justice: What's The Right Thing To Do? Episode 01 …",
        "channel": null,
        "chunk_index": 0,
        "start_time": 4.2,
        "end_time": 65.08,
        "language": "en",
        "total_chunks": 60
      }
    },
    {
      "chunk_index": 1,
      "chunk_id": "kBdfcR-8hEY_chunk_001",
      "text": "that if you crash into these five workers they will all die let's assume you know that for sure and so you feel helpless … how many would turn the trolley car onto the side track?",
      "start_time": 56.78,
      "end_time": 118.18,
      "deep_link": "https://youtu.be/kBdfcR-8hEY?t=56",
      "token_count_estimate": 150,
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
          metadata wrapper, free — and <strong>RAG JSON</strong> — the transcript already cut into
          short passages (chunks) for RAG (retrieval-augmented generation, where an AI answers using
          text pulled from your own documents). Each chunk carries a token estimate (roughly how much
          of a model&apos;s input budget its text fills) and a deep link (a YouTube URL that jumps
          straight to that moment), ready to embed in a vector database — a store that finds passages
          by meaning rather than exact keywords.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Standard JSON (free)</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A metadata wrapper around the transcript segments. Each segment has <code>text</code>,{" "}
          <code>start_time</code> and <code>end_time</code> (both in seconds; <code>end_time</code> is the
          next segment&apos;s start, or its own end for the last), plus a <code>speaker</code> when the
          transcript is diarised. The wrapper always carries <code>video_id</code>, <code>title</code>,{" "}
          <code>duration_seconds</code> and <code>extracted_at</code>, and adds <code>channel</code>,{" "}
          <code>language</code>, <code>published_at</code> and <code>extraction_method</code> when they are
          known (a video-file upload has no channel or publish date, so those are omitted). Take this when
          you want to handle the chunking and indexing yourself; it costs nothing on top of extraction.
        </p>
        <DocsCodeBlock>{stdSample}</DocsCodeBlock>

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
          <li><code>metadata</code> — video id, title, channel (<code>null</code> when the source has no channel, e.g. a video-file upload), language, chunk index, total chunks, time range</li>
        </ul>

        <AnchorHeading as="h3">Overlap strategy</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          For AI transcription the overlap snaps to whole sentences (<code>overlap_strategy: sentence_boundary</code>);
          for auto-captions it snaps to whole segments (<code>segment_boundary</code>). The example below is
          auto-captions, so chunk 1 opens by repeating the tail of chunk 0 (&quot;…they will all die let&apos;s
          assume you know that for sure&quot;) — that repeated run is the overlap.
        </p>

        <AnchorHeading as="h3">Chunk size presets</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You choose the target chunk length when you export — {RAG_CHUNK_PRESETS.map((p) => p.value).join(", ")}{" "}
          seconds. Sixty seconds is the default. Shorter chunks are tighter and better for pulling exact
          quotes; longer chunks keep more surrounding context per vector. Your preferred size is remembered
          in <a className="text-[var(--accent)] hover:underline" href="/docs/account/settings">Settings</a>.
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
            {RAG_CHUNK_PRESETS.map((p) => (
              <tr key={p.value}>
                <td>{p.label}{p.value === 60 ? " (default)" : ""}</td>
                <td>{p.sub}</td>
                <td>{p.tokens}</td>
              </tr>
            ))}
          </tbody>
        </DocsTable>

        <DocsCallout variant="costs-credits">
          RAG JSON costs {ragPer10} credit per 10 minutes of transcript (minimum 1). Standard JSON and
          the other formats are free. Re-downloading a transcript you already exported to RAG JSON is
          free.
        </DocsCallout>

        <DocsCodeBlock>{ragSample}</DocsCodeBlock>

        <DocsFigure
          src="/docs/screenshots/rag-json.png"
          alt="A RAG JSON export in use: a search query over the 60 chunks returns the best-matching chunk with its timestamp and a deep link back to that moment in the video."
          caption="The same file in use: a query returns the best-matching chunk with its timestamp and a deep link to the source."
        />

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "standard JSON metadata wrapper + segment fields (text, start_time, end_time)", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateJson)" },
            { publisher: "INDXR (own code)", supports: "RAG JSON schema, chunking, overlap, deep links, token estimate", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (buildRagJson, buildRagChunks)" },
            { publisher: "INDXR (own code)", supports: "chunk-size presets (30/60/90/120s, default 60) and token estimates", verifiedAgainst: "packages/shared/src/lib/pricing.ts (RAG_CHUNK_PRESETS)" },
            { publisher: "LangChain / Pinecone / ChromaDB / Weaviate / Qdrant", supports: "the vector databases the chunk shape targets", href: "https://python.langchain.com/docs/how_to/document_loader_json/" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Article: Transcript export formats", href: "/articles/transcript-export-formats" },
          ]}
        />
      </DocsShell>
    </>
  )
}
