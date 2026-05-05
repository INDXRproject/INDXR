import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcripts for RAG Pipelines — Chunked JSON Export | INDXR.AI",
  description:
    "Export YouTube transcripts as RAG-optimized JSON with configurable chunk sizes, 15% overlap, per-chunk deep links, and flat metadata for Pinecone, ChromaDB, and Weaviate. Real output, tested.",
}

const faqs = [
  {
    q: "Does this work for playlists?",
    a: "Yes. Extract a playlist and every video gets its own RAG JSON file.",
  },
  {
    q: "Does this work for audio I upload myself?",
    a: "Yes. Upload any audio file via the Audio tab. The output is identical — channel and language will be null since there's no YouTube metadata.",
  },
  {
    q: "Can I change the chunk size after export?",
    a: "Yes. Set your preferred default in Settings → Developer Exports. You can re-export any saved transcript with a different preset — no re-transcription needed.",
  },
  {
    q: "What embedding model should I use?",
    a: "OpenAI text-embedding-3-small is a practical default for the 200–400 token range our chunks produce. Cohere embed-english-v3.0 and Voyage AI voyage-3 are strong alternatives.",
  },
]

const sources = [
  {
    label: "Vectara NAACL 2025 — Chunking strategy benchmark (25 configs × 48 embedding models)",
    url: "https://arxiv.org/abs/2410.13070",
  },
  {
    label: "NVIDIA Technical Blog — Finding the Best Chunking Strategy for Accurate AI Responses",
    url: "https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses",
  },
  {
    label: "Chroma Research — Evaluating Chunking Strategies for Retrieval",
    url: "https://research.trychroma.com/evaluating-chunking",
  },
  {
    label: "Microsoft Azure AI Search — How to chunk documents for vector search",
    url: "https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents",
  },
  {
    label: "LangChain — Document schema concepts",
    url: "https://python.langchain.com/docs/concepts/documents",
  },
  {
    label: "Pinecone — Upsert data",
    url: "https://docs.pinecone.io/guides/data/upsert-data",
  },
  {
    label: "Weaviate — documentation",
    url: "https://weaviate.io/developers/weaviate",
  },
  {
    label: "Qdrant — documentation",
    url: "https://qdrant.tech/documentation",
  },
]

export default function YouTubeTranscriptForRagPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcripts for RAG Pipelines — Chunked, Metadata-Rich, Ready to Embed"
      metaDescription="Export YouTube transcripts as RAG-optimized JSON with configurable chunk sizes, 15% overlap, per-chunk deep links, and flat metadata for Pinecone, ChromaDB, and Weaviate. Real output, tested."
      publishedAt="2026-04-16"
      updatedAt="2026-04-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Raw YouTube transcripts are not RAG-ready. YouTube returns transcripts as 2–5 second segments
        — fragments of roughly 8–20 tokens each. Embedding models work best with 200–400 tokens of
        coherent text (
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
          Vectara NAACL 2025
        </a>
        ,{" "}
        <a
          href="https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses"
          target="_blank"
          rel="noopener noreferrer"
        >
          NVIDIA benchmark
        </a>
        ,{" "}
        <a
          href="https://research.trychroma.com/evaluating-chunking"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chroma Research
        </a>
        ,{" "}
        <a
          href="https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents"
          target="_blank"
          rel="noopener noreferrer"
        >
          Microsoft Azure AI Search
        </a>
        ). Feed them 15-token fragments and your retrieval quality degrades immediately: queries
        can&apos;t match context that&apos;s been cut into arbitrary pieces, and there&apos;s no
        metadata to filter by video, channel, or timestamp.
      </p>

      <p>
        Every developer building a YouTube-based RAG pipeline hits this problem and solves it
        manually: merge segments, pick a chunk size, handle overlap, attach metadata, format for the
        vector database. INDXR.AI&apos;s RAG JSON export does that in one click.
      </p>

      <h2>What the Output Actually Looks Like</h2>

      <p>
        Here&apos;s a real chunk from a 3Blue1Brown neural networks video (19 min, AssemblyAI
        transcription, 60s preset):
      </p>

      <pre className="prose-content-pre"><code>{`{
  "metadata": {
    "video_id": "aircAruvnKk",
    "title": "But what is a neural network? | Deep learning chapter 1",
    "duration_seconds": 1119,
    "extraction_method": "assemblyai",
    "extracted_at": "2026-04-23T18:55:35.850Z",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "sentence_boundary",
      "total_chunks": 18
    }
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "aircAruvnKk_chunk_000",
      "text": "This is a 3. It's sloppily written and rendered at an extremely low resolution of 28x28 pixels, but your brain has no trouble recognizing it as a 3. And I want you to take a moment to appreciate how crazy it is that brains can do this so effortlessly...",
      "start_time": 4.434,
      "end_time": 67.98,
      "deep_link": "https://youtu.be/aircAruvnKk?t=4",
      "token_count_estimate": 251,
      "metadata": {
        "video_id": "aircAruvnKk",
        "title": "But what is a neural network? | Deep learning chapter 1",
        "chunk_index": 0,
        "total_chunks": 18,
        "start_time": 4.434,
        "end_time": 67.98,
        "language": null
      }
    }
  ]
}`}</code></pre>

      <p>A few things worth noting directly.</p>

      <p>
        <strong><code>deep_link</code> is pre-constructed per chunk.</strong> Click it and you land
        on the exact second the chunk starts in the video. When your LLM cites a source, it can link
        to the moment, not just the video page.
      </p>

      <p>
        <strong><code>metadata</code> is flat.</strong> Vector databases require scalar key-value
        pairs — no nested objects. The structure here loads directly into{" "}
        <a href="https://docs.pinecone.io/guides/data/upsert-data" target="_blank" rel="noopener noreferrer">
          Pinecone
        </a>
        ,{" "}
        <a href="https://docs.trychroma.com" target="_blank" rel="noopener noreferrer">
          ChromaDB
        </a>
        ,{" "}
        <a href="https://weaviate.io/developers/weaviate" target="_blank" rel="noopener noreferrer">
          Weaviate
        </a>
        , and{" "}
        <a href="https://qdrant.tech/documentation" target="_blank" rel="noopener noreferrer">
          Qdrant
        </a>{" "}
        without transformation.
      </p>

      <p>
        <strong><code>token_count_estimate</code></strong> uses the cl100k_base approximation (~1.33
        tokens per word). It lets you verify chunks fit your embedding model&apos;s context window
        without running a tokenizer yourself.
      </p>

      <p>
        <strong><code>overlap_strategy</code></strong> tells you how the overlap was computed. For
        AssemblyAI transcripts with punctuation, we use sentence-boundary detection — the overlap
        ends on a complete sentence. For auto-caption transcripts without punctuation, we use
        segment-boundary overlap instead.
      </p>

      <h2>Chunk Size Options</h2>

      <p>
        Four presets, configurable in Settings → Developer Exports:
      </p>

      <table>
        <thead>
          <tr>
            <th>Preset</th>
            <th>Duration</th>
            <th>~Tokens</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Quote</td>
            <td>30s</td>
            <td>~100</td>
            <td>Short-form content, granular retrieval</td>
          </tr>
          <tr>
            <td>Balanced</td>
            <td>60s</td>
            <td>~200</td>
            <td>Default — works across most use cases</td>
          </tr>
          <tr>
            <td>Precise</td>
            <td>90s</td>
            <td>~300</td>
            <td>Inside the research-backed sweet spot</td>
          </tr>
          <tr>
            <td>Context</td>
            <td>120s</td>
            <td>~400</td>
            <td>Lectures, long-form analysis</td>
          </tr>
        </tbody>
      </table>

      <p>
        The 60s default balances retrieval granularity with semantic completeness. For lecture
        content like the Karpathy GPT video (1h56m), 90s produced 89 chunks with ~400 tokens each —
        the range that performs best for analytical queries according to{" "}
        <a
          href="https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses"
          target="_blank"
          rel="noopener noreferrer"
        >
          NVIDIA&apos;s 2024 benchmark
        </a>
        .
      </p>

      <h2>Loading into LangChain</h2>

      <p>
        Each chunk maps directly to{" "}
        <a
          href="https://python.langchain.com/docs/concepts/documents"
          target="_blank"
          rel="noopener noreferrer"
        >
          LangChain&apos;s Document schema
        </a>
        :
      </p>

      <pre className="prose-content-pre"><code>{`import json
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

with open("transcript_rag.json") as f:
    data = json.load(f)

documents = [
    Document(
        page_content=chunk["text"],
        metadata=chunk["metadata"]
    )
    for chunk in data["chunks"]
]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(documents, embeddings)

results = vectorstore.similarity_search(
    "What is the core challenge with raw transcripts?",
    k=3
)

for doc in results:
    print(f"[{doc.metadata['start_time']}s] {doc.page_content[:200]}")`}</code></pre>

      <h2>Loading into Pinecone</h2>

      <pre className="prose-content-pre"><code>{`import json
from openai import OpenAI
from pinecone import Pinecone

with open("transcript_rag.json") as f:
    data = json.load(f)

client = OpenAI()
pc = Pinecone(api_key="YOUR_API_KEY")
index = pc.Index("youtube-transcripts")

vectors = []
for chunk in data["chunks"]:
    embedding = client.embeddings.create(
        input=chunk["text"],
        model="text-embedding-3-small"
    ).data[0].embedding

    vectors.append({
        "id": chunk["chunk_id"],
        "values": embedding,
        "metadata": chunk["metadata"]
    })

for i in range(0, len(vectors), 100):
    index.upsert(vectors=vectors[i:i+100])`}</code></pre>

      <h2>Auto-Captions vs. AI Transcription for RAG</h2>

      <p>The difference matters more for RAG than for any other use case.</p>

      <p>
        Auto-captions lack punctuation. Text arrives as lowercase words without sentence boundaries.
        When the chunker tries to detect where sentences end for overlap computation, it can&apos;t —
        so it falls back to segment-boundary overlap instead. The chunks still work, but the overlap
        is less semantically clean.
      </p>

      <p>
        Auto-captions are also less accurate than AssemblyAI, particularly for accents, domain
        vocabulary, and fast speech. Errors propagate into your embeddings.
      </p>

      <p>
        For RAG pipelines where retrieval quality matters, use AI Transcription. The resulting chunks
        have proper sentence boundaries, accurate text, and sentence-level overlap. For a 19-minute
        video, AI Transcription costs 19 credits — roughly €0.23 at Basic pricing.
      </p>

      <p>
        One specific case where auto-captions are fine: if your downstream pipeline does its own text
        cleaning and doesn&apos;t rely on sentence boundaries for chunking decisions.
      </p>

      <h2>Pricing</h2>

      <p>
        RAG JSON export: 1 credit per 15 minutes of video, minimum 1.
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0–15 min</td><td>1 credit</td></tr>
          <tr><td>16–30 min</td><td>2 credits</td></tr>
          <tr><td>31–60 min</td><td>4 credits</td></tr>
          <tr><td>1h56min (Karpathy GPT)</td><td>8 credits</td></tr>
          <tr><td>2h49min (Joe Rogan Snowden)</td><td>12 credits</td></tr>
        </tbody>
      </table>

      <p>First 3 exports free. Credits never expire.</p>

      <p>
        For the standard (non-chunked) JSON format, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON Export</Link>. For a deep dive
        into chunk size research and overlap strategy, see{" "}
        <Link href="/blog/chunk-youtube-transcripts-for-rag">
          How to Chunk YouTube Transcripts for RAG
        </Link>
        . For credit packages, see the <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
