import type { Metadata } from "next"
import Link from "next/link"
import { TutorialTemplate } from "@/components/content/templates/TutorialTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcripts to Vector Database — Python Pipeline Guide | INDXR.AI",
  description:
    "Step-by-step guide to building a semantic search system over YouTube video content. Extract transcripts, generate embeddings, store in Pinecone or ChromaDB, and query with natural language.",
}

const faqs = [
  {
    q: "Which vector database should I choose?",
    a: "ChromaDB for development and small corpora — zero infrastructure, runs locally. Pinecone for production — managed, scalable, supports metadata filtering. Weaviate and Qdrant are good alternatives with more customization options.",
  },
  {
    q: "How much does embedding cost for a large corpus?",
    a: "At $0.02 per million tokens with text-embedding-3-small, embedding 100 hours of video content costs approximately $0.15–0.20. Pinecone's free tier supports 100,000 vectors — enough for 40–50 hours of content. The INDXR.AI transcription cost is the dominant expense for large corpora.",
  },
  {
    q: "Can I use a different embedding model?",
    a: "Yes. The RAG JSON output is model-agnostic — text-embedding-3-large (3072 dimensions, higher accuracy), Cohere's embed-english-v3.0, or Voyage AI's voyage-3 all work. Change the model name in the embedding calls and update the Pinecone index dimension accordingly.",
  },
  {
    q: "Does this work for non-English content?",
    a: "Yes. Use a multilingual embedding model (text-embedding-3-small handles multiple languages; Cohere's embed-multilingual-v3.0 is purpose-built for this). INDXR.AI's AI Transcription supports 99+ languages and produces properly punctuated text regardless of language.",
  },
  {
    q: "What if I want to filter results by video or channel?",
    a: "Both ChromaDB and Pinecone support metadata filtering. Add a where clause (ChromaDB) or filter (Pinecone) to restrict results: {\"channel\": \"AI Explained\"} or {\"video_id\": \"dQw4w9WgXcQ\"}.",
  },
]

const sources = [
  {
    label: "NVIDIA Technical Blog — Finding the Best Chunking Strategy for Accurate AI Responses",
    url: "https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses",
  },
  {
    label: "Qu et al. — \"Is Semantic Chunking Worth the Computational Cost?\" (NAACL 2025)",
    url: "https://arxiv.org/abs/2410.13070",
  },
  {
    label: "OpenAI — Embeddings pricing",
    url: "https://openai.com/pricing",
  },
]

const steps = [
  {
    name: "Extract transcripts as RAG JSON",
    text: "Extract your target playlist in INDXR.AI's Playlist tab with the RAG JSON toggle enabled. Download the bulk ZIP file. Each JSON file contains 90–120 second chunks with text, timestamps, deep links, and metadata — pre-processed and sized for the optimal dense retrieval range.",
  },
  {
    name: "Load and parse JSON files",
    text: "Load all RAG JSON files from the ZIP directory. For each chunk, enrich the metadata with deep_link, token_count, is_auto_generated flag, and source_url. These fields enable precise citation and source filtering in retrieval results.",
  },
  {
    name: "Embed and index in ChromaDB (local) or Pinecone (production)",
    text: "Generate embeddings using OpenAI's text-embedding-3-small. For local development, add to a ChromaDB PersistentClient collection with cosine distance. For production, upsert to a Pinecone serverless index — include the chunk text in Pinecone metadata since Pinecone doesn't store documents natively.",
  },
  {
    name: "Query with natural language",
    text: "Embed the user's query with the same model. Run collection.query() (ChromaDB) or index.query() (Pinecone) to retrieve the top-k most similar chunks. Each result includes the deep_link — a direct timestamp URL to cite in answers.",
  },
  {
    name: "Generate answers with LLM and timestamp citations",
    text: "Feed retrieved chunks to an LLM with a system prompt instructing it to cite video titles and timestamps. Build the context string with inline source labels from chunk metadata. Return the LLM response with a source links section below for verification.",
  },
]

export default function YouTubeTranscriptsVectorDatabasePage() {
  return (
    <TutorialTemplate
      title="YouTube Transcripts to Vector Database — A Complete Python Pipeline"
      metaDescription="Step-by-step guide to building a semantic search system over YouTube video content. Extract transcripts, generate embeddings, store in Pinecone or ChromaDB, and query with natural language."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
      sources={sources}
      steps={steps}
    >
      <p>
        A vector database turns a collection of YouTube transcripts into something you can ask questions.
        Not search by keyword — ask by meaning. &quot;What did the speaker say about managing technical
        debt?&quot; finds the passage even if the words &quot;managing&quot; and &quot;technical debt&quot; don&apos;t appear in the
        same sentence.
      </p>

      <p>
        This guide builds a complete pipeline: extract transcripts from a YouTube playlist, generate
        embeddings, store them in a vector database, and query with natural language. All code is working
        Python. The pipeline handles single videos or entire playlists and scales from a laptop to
        production infrastructure.
      </p>

      <h2>What We&apos;re Building</h2>

      <pre className="prose-content-pre"><code>{`YouTube playlist
    ↓
INDXR.AI RAG JSON export (chunked, metadata-rich)
    ↓
OpenAI text-embedding-3-small
    ↓
Pinecone (or ChromaDB for local development)
    ↓
Semantic search + LLM-generated answers with timestamp citations`}</code></pre>

      <p>
        The key design choice: INDXR.AI handles the hard parts of transcript processing before the data
        enters this pipeline. Raw YouTube transcripts require merging 2–5 second fragments, cleaning
        filler words, detecting sentence boundaries, computing token counts, and attaching metadata per
        chunk. The{" "}
        <Link href="/youtube-transcript-for-rag">RAG JSON export</Link> delivers all of that
        pre-processed. We write embedding and storage code, not transcript processing code.
      </p>

      <h2>Prerequisites</h2>

      <pre className="prose-content-pre"><code>{`pip install openai pinecone chromadb tiktoken requests`}</code></pre>

      <p>You&apos;ll need:</p>
      <ul>
        <li>An INDXR.AI account with credits for AI Transcription and RAG JSON export</li>
        <li>An OpenAI API key for embeddings</li>
        <li>For production: a Pinecone account (free tier available)</li>
        <li>For local development: ChromaDB runs in-process, no account needed</li>
      </ul>

      <h2>Step 1: Extract Transcripts as RAG JSON</h2>

      <p>
        Extract your target playlist in INDXR.AI&apos;s Playlist tab with the RAG JSON toggle enabled.
        Download the bulk ZIP file. The ZIP contains one JSON file per video. Each file has this
        structure:
      </p>

      <pre className="prose-content-pre"><code>{`{
  "video": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Understanding Transformers — Part 1",
    "channel": "AI Explained",
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration": 2847,
    "language": "en",
    "is_auto_generated": false
  },
  "chunking_config": {
    "strategy": "time_based_sentence_snap",
    "target_duration_seconds": 120,
    "overlap_seconds": 18,
    "total_chunks": 24
  },
  "chunks": [
    {
      "chunk_id": "dQw4w9WgXcQ_chunk_000",
      "text": "Today we're going to build up the transformer architecture from scratch...",
      "start_time": 0.0,
      "end_time": 118.4,
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=0",
      "token_count_estimate": 312,
      "metadata": {
        "video_id": "dQw4w9WgXcQ",
        "title": "Understanding Transformers — Part 1",
        "channel": "AI Explained",
        "chunk_index": 0,
        "total_chunks": 24,
        "start_time": 0.0,
        "end_time": 118.4
      }
    }
  ]
}`}</code></pre>

      <p>
        Each chunk is 90–120 seconds of speech (~300–400 tokens), sized for the optimal dense retrieval
        range established by NVIDIA&apos;s chunking benchmark and the Vectara NAACL 2025 study. See{" "}
        <Link href="/blog/chunk-youtube-transcripts-for-rag">
          How to Chunk YouTube Transcripts for RAG
        </Link>{" "}
        for the research behind these defaults.
      </p>

      <h2>Step 2: Load and Parse JSON Files</h2>

      <pre className="prose-content-pre"><code>{`import json
import glob
import os

def load_rag_json_files(directory: str) -> list[dict]:
    """Load all RAG JSON files from a directory."""
    all_chunks = []

    for filepath in glob.glob(os.path.join(directory, "*.json")):
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)

        video_info = data.get("video", {})
        chunks = data.get("chunks", [])

        for chunk in chunks:
            enriched_metadata = {
                **chunk["metadata"],
                "deep_link": chunk["deep_link"],
                "token_count": chunk.get("token_count_estimate", 0),
                "is_auto_generated": video_info.get("is_auto_generated", True),
                "source_url": video_info.get("source_url", "")
            }

            all_chunks.append({
                "id": chunk["chunk_id"],
                "text": chunk["text"],
                "metadata": enriched_metadata
            })

    print(f"Loaded {len(all_chunks)} chunks from {len(glob.glob(os.path.join(directory, '*.json')))} videos")
    return all_chunks

chunks = load_rag_json_files("./transcripts/")`}</code></pre>

      <h2>Step 3a: Local Development with ChromaDB</h2>

      <p>
        ChromaDB runs in-process — no server, no account. Good for development and small corpora (under
        ~100,000 chunks).
      </p>

      <pre className="prose-content-pre"><code>{`import chromadb
from openai import OpenAI

openai_client = OpenAI()
chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(
    name="youtube_transcripts",
    metadata={"hnsw:space": "cosine"}
)

def embed_batch(texts: list[str]) -> list[list[float]]:
    response = openai_client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    return [item.embedding for item in response.data]

# Index all chunks
BATCH_SIZE = 100
for i in range(0, len(chunks), BATCH_SIZE):
    batch = chunks[i:i + BATCH_SIZE]

    texts = [c["text"] for c in batch]
    ids = [c["id"] for c in batch]
    metadatas = [c["metadata"] for c in batch]
    embeddings = embed_batch(texts)

    collection.add(
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

    print(f"Indexed {min(i + BATCH_SIZE, len(chunks))}/{len(chunks)} chunks")

print(f"Total indexed: {collection.count()}")`}</code></pre>

      <h2>Step 3b: Production with Pinecone</h2>

      <p>Pinecone scales to millions of vectors and supports filtering by metadata fields.</p>

      <pre className="prose-content-pre"><code>{`from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="YOUR_PINECONE_API_KEY")

index_name = "youtube-transcripts"
if index_name not in [i.name for i in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,  # text-embedding-3-small dimension
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

index = pc.Index(index_name)

BATCH_SIZE = 100
for i in range(0, len(chunks), BATCH_SIZE):
    batch = chunks[i:i + BATCH_SIZE]

    texts = [c["text"] for c in batch]
    embeddings = embed_batch(texts)

    vectors = [
        {
            "id": chunk["id"],
            "values": embedding,
            "metadata": {
                **chunk["metadata"],
                "text": chunk["text"]
            }
        }
        for chunk, embedding in zip(batch, embeddings)
    ]

    index.upsert(vectors=vectors)
    print(f"Upserted {min(i + BATCH_SIZE, len(chunks))}/{len(chunks)} chunks")

stats = index.describe_index_stats()
print(f"Index stats: {stats.total_vector_count} vectors")`}</code></pre>

      <h2>Step 4: Query with Natural Language</h2>

      <pre className="prose-content-pre"><code>{`def search(query: str, n_results: int = 5, filter_channel: str = None):
    """Search the knowledge base with optional channel filter."""

    query_embedding = openai_client.embeddings.create(
        input=[query],
        model="text-embedding-3-small"
    ).data[0].embedding

    where_filter = {}
    if filter_channel:
        where_filter = {"channel": {"$eq": filter_channel}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where_filter if where_filter else None
    )

    output = []
    for doc, metadata in zip(results["documents"][0], results["metadatas"][0]):
        output.append({
            "text": doc,
            "title": metadata.get("title"),
            "channel": metadata.get("channel"),
            "deep_link": metadata.get("deep_link"),
            "start_time": metadata.get("start_time"),
        })

    return output

results = search("how do attention mechanisms work in transformers")
for r in results:
    print(f"\\n{r['title']} — {r['deep_link']}")
    print(f"{r['text'][:200]}...")`}</code></pre>

      <h2>Step 5: Add an LLM Answer Layer</h2>

      <pre className="prose-content-pre"><code>{`def answer(question: str, n_chunks: int = 4) -> str:
    """Generate an answer with source citations."""

    relevant_chunks = search(question, n_results=n_chunks)

    context = "\\n\\n".join([
        f"[Source: {c['title']} at {int(c['start_time'] // 60)}:{int(c['start_time'] % 60):02d}]\\n{c['text']}"
        for c in relevant_chunks
    ])

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer questions based on the provided YouTube transcript excerpts. "
                    "Cite the video title and timestamp for each claim. "
                    "If the context doesn't contain enough information, say so."
                )
            },
            {
                "role": "user",
                "content": f"Context:\\n{context}\\n\\nQuestion: {question}"
            }
        ],
        temperature=0.1
    )

    answer_text = response.choices[0].message.content
    source_links = "\\n".join([
        f"- [{c['title']}]({c['deep_link']})"
        for c in relevant_chunks
    ])

    return f"{answer_text}\\n\\n**Sources:**\\n{source_links}"

print(answer("Explain the role of positional encoding in transformers"))`}</code></pre>

      <h2>Embedding Cost Estimate</h2>

      <p>
        <code>text-embedding-3-small</code> costs $0.02 per million tokens. For a 20-video playlist
        with an average of 30 minutes per video:
      </p>
      <ul>
        <li>~20 videos × 30 min × 2.5 chunks/min × 350 tokens/chunk = ~525,000 tokens</li>
        <li>Embedding cost: <strong>~$0.01</strong> for the full corpus</li>
      </ul>

      <p>
        The embedding cost is negligible. The primary cost is INDXR.AI credits for AI Transcription
        (~€0.012/credit at Plus, 1 credit/minute = ~€0.36 for 30 minutes). See{" "}
        <Link href="/pricing">pricing</Link> for package details.
      </p>

      <h2>Keeping the Index Current</h2>

      <p>
        INDXR.AI&apos;s duplicate detection means re-running a playlist extraction only processes new videos.
        Re-embed and upsert only the new chunks:
      </p>

      <pre className="prose-content-pre"><code>{`# Track already-indexed chunk IDs to avoid re-embedding
existing_ids = set()  # Load from your tracking store

new_chunks = [c for c in load_rag_json_files("./new_transcripts/")
              if c["id"] not in existing_ids]

if new_chunks:
    print(f"Indexing {len(new_chunks)} new chunks")
    # Index using same batching logic above`}</code></pre>

      <p>
        To start: <Link href="/youtube-transcript-for-rag">extract any YouTube video as RAG JSON</Link>.
        For the chunking research behind the 90–120 second default, see{" "}
        <Link href="/blog/chunk-youtube-transcripts-for-rag">
          How to Chunk YouTube Transcripts for RAG
        </Link>
        .
      </p>
    </TutorialTemplate>
  )
}
