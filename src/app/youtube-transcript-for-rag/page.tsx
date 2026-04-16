import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcripts for RAG Pipelines — Chunked JSON Export | INDXR.AI",
  description:
    "Export YouTube transcripts as RAG-optimized JSON with 90-120 second chunks, sentence boundaries, timestamps, and chapter metadata. Works with LangChain, LlamaIndex, Pinecone, and ChromaDB.",
}

const faqs = [
  {
    q: "What embedding model should I use with this output?",
    a: "The chunks are sized for dense retrieval models in the 300–400 token range. OpenAI's text-embedding-3-small (1536 dimensions, $0.02/1M tokens) is a practical default. Cohere's embed-english-v3.0 and Voyage AI's voyage-3 are strong alternatives. The token_count_estimate field in each chunk uses cl100k_base tokenization — adjust for other tokenizers.",
  },
  {
    q: "Does RAG JSON export work for playlists?",
    a: "Yes. In playlist extraction, enable RAG JSON as a per-video toggle or globally for all videos in the batch. Each video produces a separate JSON file; for bulk processing, download as a ZIP. Each file follows the same schema, so you can process them uniformly.",
  },
  {
    q: "Can I process audio uploads as RAG JSON?",
    a: "Yes. Upload an audio file (MP3, WAV, M4A, OGG, FLAC, WEBM, up to 500MB), enable AI Transcription, and toggle RAG JSON export. The output schema is identical — the transcript_source field will show assemblyai and is_auto_generated will be false.",
  },
  {
    q: "How is the token_count_estimate calculated?",
    a: "Using tiktoken with the cl100k_base encoder — the same tokenizer used by OpenAI's embedding models. The estimate assumes ~1.33 tokens per English word. For non-English content or technical text with many numbers, actual token counts may differ by 10–20%.",
  },
  {
    q: "What's the difference between the standard JSON export and RAG JSON?",
    a: "Standard JSON exports raw segments (2–5 seconds each, ~10–20 tokens) with minimal metadata — useful for developers who want the raw data. RAG JSON merges those segments into 90–120 second chunks (~300–400 tokens), adds sentence-boundary snapping, 15% overlap, per-chunk deep links, flat metadata objects, and a video-level wrapper. Standard JSON is a data format; RAG JSON is a pipeline-ready input.",
  },
  {
    q: "Can I adjust the chunk size?",
    a: "The default is 120-second chunks with 18-second (15%) overlap. If you need different chunk sizes — for example, 30-second chunks for short-form content or 60-second chunks for a denser index — select from the preset options (30s, 60s, 90s, 120s) in the export settings. The 120-second default is the research-backed sweet spot for most RAG workloads.",
  },
]

export default function YouTubeTranscriptForRagPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcripts for RAG Pipelines — Chunked, Metadata-Rich, Ready to Embed"
      metaDescription="Export YouTube transcripts as RAG-optimized JSON with 90-120 second chunks, sentence boundaries, timestamps, and chapter metadata. Works with LangChain, LlamaIndex, Pinecone, and ChromaDB."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
    >
      <p>
        Raw YouTube transcripts are not RAG-ready. YouTube returns transcripts as arrays of 2–5 second
        segments — fragments so short they contain only a sentence fragment or two. Load these directly
        into a vector database and your retrieval quality degrades immediately: chunks lack context,
        semantic boundaries are arbitrary, and there&apos;s no metadata to filter by video, timestamp, or
        topic. Every developer who has tried to build a YouTube-based RAG system has hit this problem and
        solved it manually with the same boilerplate pipeline.
      </p>

      <p>
        INDXR.AI&apos;s RAG JSON export does that pipeline for you. One export, one file, ready to load into
        any vector database.
      </p>

      <h2>Why Raw YouTube Segments Break RAG</h2>

      <p>
        The standard YouTube transcript format — what the <code>youtube-transcript-api</code> Python
        library returns — looks like this:
      </p>

      <pre className="prose-content-pre"><code>{`[
  {"text": "so the first thing you need", "start": 0.0, "duration": 2.3},
  {"text": "to understand about embeddings", "start": 2.3, "duration": 2.1},
  {"text": "is that they represent meaning", "start": 4.4, "duration": 2.8}
]`}</code></pre>

      <p>
        Each segment is 2–5 seconds of speech — roughly 5–15 words, approximately 8–20 tokens. Embedding
        models work best with chunks of 256–512 tokens (Vectara NAACL 2025, tested across 25 chunking
        configurations and 48 embedding models). Feeding 15-token fragments produces embeddings with almost
        no semantic content. A query about &quot;how embeddings represent meaning&quot; would need to retrieve
        three separate chunks just to reassemble one complete thought.
      </p>

      <p>
        The second problem is missing metadata. These segments have <code>text</code>, <code>start</code>,
        and <code>duration</code>. They have no video title, no channel, no language, no chapter context,
        no direct link back to the timestamp in the video. Once you embed these fragments and store them in
        Pinecone or ChromaDB, you&apos;ve lost all provenance.
      </p>

      <h2>What &quot;RAG-Ready&quot; Actually Means</h2>

      <p>
        A chunk is RAG-ready when it meets three criteria: it&apos;s the right size for your embedding model,
        it preserves semantic boundaries, and it carries enough metadata for downstream use.
      </p>

      <p>
        <strong>Size:</strong> The 256–512 token range is the established sweet spot for dense retrieval.
        NVIDIA&apos;s 2024 benchmark found 512–1024 tokens performed best for analytical queries; smaller
        256–512 token chunks excelled at factoid retrieval. For YouTube specifically, 90–120 seconds of
        spoken English produces approximately 300–400 tokens at an average speaking pace of 150 words per
        minute — squarely in the optimal range.
      </p>

      <p>
        <strong>Semantic boundaries:</strong> Time-based chunking with sentence-boundary snapping works
        better than pure fixed-time splits. Rather than cutting exactly at 120 seconds, the chunker adjusts
        ±5 seconds to land on a sentence end. The Vectara NAACL 2025 study found that chunking strategy
        had equal or greater influence on retrieval quality than embedding model choice.
      </p>

      <p>
        <strong>Metadata:</strong> Every chunk needs enough context to be useful after retrieval. When an
        LLM retrieves a chunk to answer a question, it needs to cite the source. That means the chunk must
        carry the video title, channel, timestamp, and ideally a direct link to that moment in the video.
      </p>

      <h2>The INDXR.AI RAG JSON Schema</h2>

      <p>
        The RAG JSON export wraps all chunks in a structured document with two top-level sections:
        video-level metadata and the chunks array.
      </p>

      <pre className="prose-content-pre"><code>{`{
  "version": "1.0",
  "video": {
    "video_id": "dQw4w9WgXcQ",
    "title": "How to Build a RAG Pipeline",
    "channel": "AI Engineering Weekly",
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration": 3612,
    "language": "en",
    "is_auto_generated": false,
    "transcript_source": "assemblyai"
  },
  "chunking_config": {
    "strategy": "time_based_sentence_snap",
    "target_duration_seconds": 120,
    "overlap_seconds": 18,
    "total_chunks": 31
  },
  "chunks": [
    {
      "chunk_id": "dQw4w9WgXcQ_chunk_000",
      "chunk_index": 0,
      "text": "Today we're going to walk through building a complete RAG pipeline using YouTube transcripts as the data source. The core challenge is that raw transcripts aren't structured for retrieval — they're structured for reading along with a video.",
      "start_time": 0.0,
      "end_time": 118.4,
      "start_time_formatted": "00:00:00",
      "end_time_formatted": "00:01:58",
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=0",
      "token_count_estimate": 312,
      "chapter_title": "Introduction",
      "metadata": {
        "video_id": "dQw4w9WgXcQ",
        "title": "How to Build a RAG Pipeline",
        "channel": "AI Engineering Weekly",
        "chunk_index": 0,
        "total_chunks": 31,
        "start_time": 0.0,
        "end_time": 118.4,
        "chapter_title": "Introduction",
        "language": "en"
      }
    }
  ]
}`}</code></pre>

      <p>A few fields worth noting:</p>

      <p>
        <strong><code>deep_link</code></strong> — Pre-constructed <code>youtu.be/ID?t=N</code> URL
        pointing to the exact second this chunk starts. When your LLM cites a source, it can link directly
        to the moment in the video rather than just the video page.
      </p>

      <p>
        <strong><code>metadata</code></strong> — A flat key-value object on every chunk, structured for
        direct upsert into Pinecone, ChromaDB, Weaviate, and Qdrant. The flat structure is intentional —
        vector databases require scalar metadata values, not nested objects.
      </p>

      <p>
        <strong><code>overlap_seconds: 18</code></strong> — 15% overlap on 120-second chunks. NVIDIA&apos;s
        testing found 15% overlap performed best across benchmark queries. The <code>overlap_token_count</code>{" "}
        field lets you deduplicate if needed.
      </p>

      <h2>Loading into LangChain</h2>

      <p>
        INDXR.AI&apos;s RAG JSON output maps directly to LangChain&apos;s <code>Document</code> schema. Each chunk
        becomes one <code>Document</code> with <code>page_content</code> from the <code>text</code> field
        and <code>metadata</code> from the flat metadata object.
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
    print(f"[{doc.metadata['start_time']}s] {doc.page_content[:200]}")
    print(f"Source: {doc.metadata.get('deep_link', '')}\n")`}</code></pre>

      <p>
        The deep link in metadata means your LLM responses can cite specific video timestamps: &quot;According
        to AI Engineering Weekly (00:00:00 — 00:01:58): [chunk text].&quot;
      </p>

      <h2>Loading into LlamaIndex</h2>

      <pre className="prose-content-pre"><code>{`from llama_index.core import Document, VectorStoreIndex
import json

with open("transcript_rag.json") as f:
    data = json.load(f)

documents = [
    Document(
        text=chunk["text"],
        metadata={
            **chunk["metadata"],
            "deep_link": chunk["deep_link"],
            "start_time_formatted": chunk["start_time_formatted"]
        }
    )
    for chunk in data["chunks"]
]

index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()

response = query_engine.query("Explain the chunking strategy used")
print(response)`}</code></pre>

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
    index.upsert(vectors=vectors[i:i+100])

print(f"Upserted {len(vectors)} chunks from '{data['video']['title']}'")
`}</code></pre>

      <p>Filter queries by video or channel after ingestion:</p>

      <pre className="prose-content-pre"><code>{`results = index.query(
    vector=query_embedding,
    top_k=5,
    filter={"channel": "AI Engineering Weekly"}
)`}</code></pre>

      <h2>Auto-Captions vs. AI Transcription for RAG</h2>

      <p>This distinction matters more for RAG than for any other use case.</p>

      <p>
        Auto-generated captions have two problems that hurt RAG quality specifically. First, they lack
        punctuation — text arrives as a stream of lowercase words without sentence boundaries. The chunker
        uses sentence endpoints to snap boundaries; without them, chunk edges are arbitrary mid-sentence
        cuts. Second, auto-captions have lower accuracy (60–95% depending on audio quality, compared to
        94–96%+ for AssemblyAI on clean speech). Errors in the source text propagate into your embeddings.
      </p>

      <p>
        For RAG pipelines where retrieval quality matters, use AI Transcription as your source. Enable the
        AI Transcription toggle before extracting, confirm the credit cost, and the resulting transcript
        has proper punctuation, accurate text, and meaningful sentence boundaries.
      </p>

      <p>
        INDXR.AI shows a warning when you enable RAG JSON export on an auto-caption transcript. You can
        proceed — it will work — but the chunk quality will be lower than an AssemblyAI-sourced transcript.
      </p>

      <h2>Pricing for RAG JSON Export</h2>

      <p>
        RAG JSON export costs 1 credit per 15 minutes of video content (rounded up), minimum 1 credit:
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>RAG export cost</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0–15 min</td><td>1 credit</td></tr>
          <tr><td>16–30 min</td><td>2 credits</td></tr>
          <tr><td>31–60 min</td><td>4 credits</td></tr>
          <tr><td>61–120 min</td><td>8 credits</td></tr>
          <tr><td>121+ min</td><td>1 credit per 15 min</td></tr>
        </tbody>
      </table>

      <p>
        The first 3 RAG JSON exports are free, regardless of video length — enough to validate the format
        in your actual pipeline before spending credits.
      </p>

      <p>
        If you&apos;re combining AI Transcription with RAG export, the costs are separate: AI Transcription at
        1 credit per minute, RAG export at 1 credit per 15 minutes. A 60-minute video without captions: 60
        credits (AI Transcription) + 4 credits (RAG export) = 64 credits total.
      </p>

      <p>
        You can also apply RAG export to transcripts already in your library. If you transcribed a video
        six months ago, open it from the library and export as RAG JSON — the export uses the stored
        transcript data and charges only the RAG export cost, not re-transcription.
      </p>

      <p>
        For the standard JSON format without chunking, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON Export</Link>. For audio file
        uploads, see <Link href="/audio-to-text">Audio Upload</Link>. For credit packages, see the{" "}
        <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
