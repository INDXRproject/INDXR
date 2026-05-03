import type { Metadata } from "next"
import Link from "next/link"
import { TutorialTemplate } from "@/components/content/templates/TutorialTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Channel Knowledge Base — Transcribe, Index & Search | INDXR.AI",
  description:
    "Extract transcripts from an entire YouTube channel, embed them in a vector database, and build a semantic search system over months or years of video content. Step-by-step guide.",
}

const faqs = [
  {
    q: "How many videos can a single INDXR.AI extraction handle?",
    a: "We recommend batches of up to 100 videos for reliable results. For larger channels, extract in batches and all results accumulate in the same library. The largest test we've completed: 19 videos, 783 minutes of total audio, completed in under 19 minutes.",
  },
  {
    q: "Is auto-caption quality good enough for a knowledge base?",
    a: "For retrieval purposes, auto-captions are often sufficient — keyword matching and semantic similarity work with unpunctuated text. For use cases where the retrieved text will be shown to users or read directly, AI transcription produces more readable output with proper sentence boundaries, which also improves chunk coherence.",
  },
  {
    q: "What embedding model should I use?",
    a: "OpenAI's text-embedding-3-small (1536 dimensions) is a practical default — good performance, low cost ($0.02/1M tokens). For multilingual content, Cohere's embed-multilingual-v3.0 handles 100+ languages. For highest accuracy, Voyage AI's voyage-3 consistently benchmarks well. INDXR.AI's RAG JSON output is model-agnostic — the same JSON works with any embedding provider.",
  },
  {
    q: "Can I build this without writing code?",
    a: "For no-code pipelines, n8n and Make.com both support vector database nodes (Pinecone, Qdrant) and HTTP requests to OpenAI's embedding API. INDXR.AI's RAG JSON provides the structured input; n8n or Make.com handle the embedding and storage steps without code.",
  },
]

const sources = [
  {
    label: "ChromaDB documentation",
    url: "https://docs.trychroma.com/docs/overview/introduction",
  },
  {
    label: "OpenAI — text-embedding-3-small model card",
    url: "https://platform.openai.com/docs/models/text-embedding-3-small",
  },
]

const steps = [
  {
    name: "Build the playlist",
    text: "INDXR.AI accepts playlist URLs, not channel URLs directly. Use an existing channel playlist or create your own: log into YouTube, open the channel, and use 'Save to playlist' on each video. You can create a playlist of up to 500 videos from any public channel. For channels with hundreds of videos, batch by year or topic for easier incremental updates.",
  },
  {
    name: "Extract transcripts with INDXR.AI",
    text: "Paste the playlist URL into INDXR.AI's Playlist tab. The pre-extraction scan shows every video's caption availability, duration, and whether you've already processed it. For a knowledge base, enable AI Transcription — punctuation and accuracy matter when transcripts become your retrieval corpus. Select RAG JSON export for all videos in the batch.",
  },
  {
    name: "Understand the RAG JSON output",
    text: "Each video's RAG JSON file contains 90–120 second chunks with everything a vector database needs: chunk text, start and end timestamps, a pre-constructed deep link to the exact moment in the video, token count estimate, and a flat metadata object with video ID, title, channel, and chunk index.",
  },
  {
    name: "Build the vector index",
    text: "Load the RAG JSON files, embed each chunk using OpenAI's text-embedding-3-small, and add them to a ChromaDB collection (local, no infrastructure) or Pinecone index (production, scalable). For a 50-video knowledge base, embedding cost is approximately $0.01–0.05 using text-embedding-3-small at $0.02/1M tokens.",
  },
  {
    name: "Query with natural language",
    text: "Embed the user's query with the same model, run a similarity search against the collection, and return the top matching chunks. Each result includes the deep_link field — the direct timestamp URL that lets the downstream system cite sources precisely.",
  },
  {
    name: "Add an LLM answer layer",
    text: "Feed retrieved chunks to an LLM with a system prompt instructing it to cite video titles and timestamps. The deep_link per chunk enables inline citations that users can click to jump directly to the relevant moment in the video.",
  },
]

export default function YouTubeChannelKnowledgeBasePage() {
  return (
    <TutorialTemplate
      title="Turn Any YouTube Channel Into a Searchable AI Knowledge Base"
      metaDescription="Extract transcripts from an entire YouTube channel, embed them in a vector database, and build a semantic search system over months or years of video content. Step-by-step guide."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      steps={steps}
    >
      <p>
        YouTube channels are dense information archives. A university lecture series, a technical
        conference, a prolific educator with hundreds of videos — the content is there, but it&apos;s locked
        in a format you can only consume sequentially. You can&apos;t search across a hundred videos for every
        time a speaker discussed a specific concept, compare how their thinking evolved on a topic over
        three years, or ask an AI assistant a question and have it retrieve the relevant moment from a
        6-hour lecture.
      </p>

      <p>
        A semantic knowledge base solves this. The workflow: extract transcripts from the channel&apos;s
        videos, convert them to embeddings, store them in a vector database, and build a search interface
        that retrieves the most relevant passages for any natural language query.
      </p>

      <h2>Why YouTube Is a High-Value Source for Knowledge Bases</h2>

      <p>
        YouTube hosts content that doesn&apos;t exist anywhere else in accessible form. Conference keynotes
        with no published proceedings, interview series where experts share knowledge they never wrote
        down, educational courses from institutions that don&apos;t publish transcripts. The transcript is the
        text layer that makes this content processable.
      </p>

      <p>
        The value of a knowledge base over individual video search is precision. YouTube&apos;s own search
        finds videos whose titles or descriptions match your query. A semantic knowledge base finds the
        specific 90-second passage in a 3-hour lecture where a concept was explained — and links you
        directly to that timestamp. The granularity is different by an order of magnitude.
      </p>

      <h2>Step 1: Build the Playlist</h2>

      <p>
        INDXR.AI accepts playlist URLs, not channel URLs directly. There are two practical paths:
      </p>

      <p>
        <strong>Path A: Use an existing playlist.</strong> Many channels organize content into playlists
        by series or topic. If the channel has thematic playlists — a lecture series, a conference year,
        a topic archive — use those URLs directly.
      </p>

      <p>
        <strong>Path B: Create your own playlist.</strong> Log into YouTube, open the channel, and use
        the &quot;Save to playlist&quot; option on each video. You can create a playlist of up to 500 videos from
        any public channel. For channels with hundreds of videos, batch by year or topic rather than
        extracting everything at once — this makes the knowledge base easier to update incrementally.
      </p>

      <h2>Step 2: Extract Transcripts with INDXR.AI</h2>

      <p>
        Paste the playlist URL into INDXR.AI&apos;s{" "}
        <Link href="/bulk-youtube-transcript">Playlist tab</Link>. The pre-extraction scan shows every
        video&apos;s caption availability, duration, and whether you&apos;ve already processed it. For a channel
        knowledge base, AI Transcription produces punctuated, accurately capitalized text — the quality
        difference matters when these transcripts become your retrieval corpus.
      </p>

      <p><strong>Credit cost for a typical knowledge base project:</strong></p>

      <p>
        A channel with 50 videos averaging 30 minutes each, all processed with AI Transcription:
      </p>
      <ul>
        <li>50 videos × 30 minutes × 1 credit/minute = <strong>1,500 credits</strong></li>
        <li>At Plus pricing (€0.012/credit): <strong>€18</strong></li>
        <li>RAG JSON export: 1,500 minutes ÷ 15 minutes per credit = <strong>100 more credits</strong></li>
        <li>Total: <strong>1,600 credits = ~€19.20</strong></li>
      </ul>

      <p>
        This is a one-time extraction cost. The knowledge base persists indefinitely; adding new videos
        costs only the per-video transcription.
      </p>

      <h2>Step 3: Understand the RAG JSON Output</h2>

      <p>
        Each video&apos;s <Link href="/youtube-transcript-for-rag">RAG JSON</Link> file contains 90–120 second
        chunks with everything a vector database needs:
      </p>

      <pre className="prose-content-pre"><code>{`{
  "video": {
    "video_id": "kBdfcR-8hEY",
    "title": "Justice: What's the Right Thing to Do? Episode 1",
    "channel": "Harvard University",
    "source_url": "https://www.youtube.com/watch?v=kBdfcR-8hEY",
    "duration": 3421
  },
  "chunks": [
    {
      "chunk_id": "kBdfcR-8hEY_chunk_000",
      "text": "Suppose the brakes on your trolley fail...",
      "start_time": 0.0,
      "end_time": 118.4,
      "deep_link": "https://youtu.be/kBdfcR-8hEY?t=0",
      "token_count_estimate": 312,
      "metadata": {
        "video_id": "kBdfcR-8hEY",
        "title": "Justice: What's the Right Thing to Do? Episode 1",
        "channel": "Harvard University",
        "chunk_index": 0
      }
    }
  ]
}`}</code></pre>

      <p>
        The <code>deep_link</code> field is the key feature for a knowledge base: when your AI system
        retrieves a chunk and uses it to answer a question, it can cite the exact video and timestamp
        rather than just the video title.
      </p>

      <h2>Step 4: Build the Vector Index</h2>

      <p>
        The following example uses ChromaDB (local, no infrastructure required) and OpenAI embeddings.
        The same pattern works with Pinecone, Weaviate, or Qdrant for production deployments.
      </p>

      <pre className="prose-content-pre"><code>{`import json
import glob
import chromadb
from openai import OpenAI

client = OpenAI()
chroma_client = chromadb.PersistentClient(path="./knowledge_base")
collection = chroma_client.get_or_create_collection(
    name="youtube_channel",
    metadata={"hnsw:space": "cosine"}
)

def embed_texts(texts):
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    return [item.embedding for item in response.data]

# Process all RAG JSON files
for filepath in glob.glob("./transcripts/*.json"):
    with open(filepath) as f:
        data = json.load(f)

    chunks = data["chunks"]
    if not chunks:
        continue

    texts = [chunk["text"] for chunk in chunks]
    ids = [chunk["chunk_id"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]

    # Add deep_link to metadata for citation
    for i, chunk in enumerate(chunks):
        metadatas[i]["deep_link"] = chunk["deep_link"]

    # Embed in batches of 100
    for i in range(0, len(texts), 100):
        batch_texts = texts[i:i+100]
        batch_embeddings = embed_texts(batch_texts)

        collection.add(
            embeddings=batch_embeddings,
            documents=batch_texts,
            metadatas=metadatas[i:i+100],
            ids=ids[i:i+100]
        )

    print(f"Indexed {len(chunks)} chunks from: {data['video']['title']}")

print(f"Total chunks indexed: {collection.count()}")`}</code></pre>

      <h2>Step 5: Query with Natural Language</h2>

      <pre className="prose-content-pre"><code>{`def search_knowledge_base(query, n_results=5):
    query_embedding = client.embeddings.create(
        input=[query],
        model="text-embedding-3-small"
    ).data[0].embedding

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    print(f"\\nQuery: {query}\\n")
    for i, (doc, metadata) in enumerate(zip(
        results["documents"][0],
        results["metadatas"][0]
    )):
        print(f"Result {i+1}:")
        print(f"  Video: {metadata['title']}")
        print(f"  Link: {metadata['deep_link']}")
        print(f"  Text: {doc[:200]}...")
        print()

search_knowledge_base("trolley problem and utilitarian ethics")
search_knowledge_base("how does Rawls define justice")`}</code></pre>

      <h2>Step 6: Add an LLM Response Layer</h2>

      <pre className="prose-content-pre"><code>{`def answer_question(question, n_chunks=4):
    query_embedding = client.embeddings.create(
        input=[question],
        model="text-embedding-3-small"
    ).data[0].embedding

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_chunks
    )

    context_parts = []
    for doc, metadata in zip(results["documents"][0], results["metadatas"][0]):
        source = f"{metadata['title']}"
        context_parts.append(f"[Source: {source}]\\n{doc}")

    context = "\\n\\n".join(context_parts)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Answer questions based on the provided transcript excerpts. Always cite the video title and timestamp for claims you make."
            },
            {"role": "user", "content": f"Context:\\n{context}\\n\\nQuestion: {question}"}
        ]
    )

    return response.choices[0].message.content

answer = answer_question("Explain the trolley problem and its implications for moral philosophy")
print(answer)`}</code></pre>

      <h2>Keeping the Knowledge Base Current</h2>

      <p>
        For channels that publish regularly, INDXR.AI&apos;s duplicate detection means re-running a playlist
        extraction only processes new videos — existing ones are skipped and not charged. A simple
        update workflow: extract the channel playlist weekly or monthly, new transcripts appear
        automatically and are ready to embed.
      </p>

      <p>
        For the full chunking research behind the 90–120 second default chunk size, see{" "}
        <Link href="/blog/chunk-youtube-transcripts-for-rag">
          How to Chunk YouTube Transcripts for RAG
        </Link>
        . For credit packages, see <Link href="/pricing">pricing</Link>.
      </p>
    </TutorialTemplate>
  )
}
