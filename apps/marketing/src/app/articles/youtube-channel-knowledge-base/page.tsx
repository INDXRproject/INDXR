import type { Metadata } from "next"
import Link from "next/link"
import { TutorialTemplate } from "@/components/content/templates/TutorialTemplate"
import { AskYourLibrary } from "@/components/docs/AskYourLibrary"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import {
  CREDIT_COSTS,
  FREE_TIER,
  creditCostEur,
  getAnchorPackage,
  anchorPerCreditText,
  RAG_CHUNK_DEFAULT,
  RAG_CHUNK_PRESETS,
} from "@indxr/shared/lib/pricing"
import { MAX_PLAYLIST_VIDEOS_PER_JOB } from "@indxr/shared/lib/limits"

// 2026-11-09 rewrite (positioning 9-11): the no-code path (playlist → cited, searchable collection →
// Claude/ChatGPT via the read-only connector) comes first; the RAG JSON / vector-database pipeline is
// the "build your own" second half. Fixed the old claim that a YouTube playlist holds "up to 500
// videos": 500 is INDXR's per-job cap (MAX_PLAYLIST_VIDEOS_PER_JOB), not a YouTube limit.

const defaultChunk = RAG_CHUNK_DEFAULT
const otherPresets = RAG_CHUNK_PRESETS.map((p) => p.value).filter((v) => v !== RAG_CHUNK_DEFAULT)
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const perCaption = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const freeVideos = FREE_TIER.PLAYLIST_FREE_VIDEOS

// Worked example: 50 videos averaging 30 minutes. Every credit figure derives from pricing.ts.
const EX_VIDEOS = 50
const EX_MINUTES = 30
const exCaptionCredits = Math.max(0, EX_VIDEOS - freeVideos) * perCaption
const exAiCredits = EX_VIDEOS * EX_MINUTES * perMin
const exRagCredits = Math.ceil((EX_VIDEOS * EX_MINUTES) / 10) * CREDIT_COSTS.RAG_JSON_PER_10MIN

const metaDescription =
  "Turn a YouTube channel into a searchable, cited library you can ask from Claude or ChatGPT, no code needed. Or export RAG JSON and build your own vector search."

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-channel-knowledge-base" },
  title: "YouTube Channel Knowledge Base — Search & Ask It in Claude | INDXR.AI",
  description: metaDescription,
  ...editorialOg("youtube-channel-knowledge-base"),
}

const faqs = [
  {
    q: "Can I build this without writing code?",
    a: "Yes, and for most people that is the better route. Extract the channel's playlists into your INDXR library, then connect the library to Claude or ChatGPT. The assistant searches the transcripts and answers with quotes, timestamps and the source. The connector is read-only and free on every account.",
  },
  {
    q: "How many videos can a single INDXR job handle?",
    a: `Up to ${MAX_PLAYLIST_VIDEOS_PER_JOB} videos per job. That is INDXR's limit, not YouTube's: a YouTube playlist can hold far more. A larger playlist is split into batches, and every batch lands in the same library. Each job runs in the background, so you can close the tab.`,
  },
  {
    q: "Is auto-caption quality good enough for a knowledge base?",
    a: "For search and retrieval, auto-captions are often enough: keyword matching and semantic similarity work with unpunctuated text. When the text will be quoted or read directly, AI transcription gives more readable output with proper sentence boundaries, which also makes chunks more coherent.",
  },
  {
    q: "When should I build my own vector database instead?",
    a: "When you are building a product: a search feature for other people, a chatbot on your site, or a pipeline that has to run without you. For your own research, the connector does the retrieval for you. RAG JSON is model-agnostic, so the same export works with any embedding provider.",
  },
]

const sources = [
  { label: "ChromaDB documentation", url: "https://docs.trychroma.com/docs/overview/introduction" },
  { label: "OpenAI — text-embedding-3-small model card", url: "https://platform.openai.com/docs/models/text-embedding-3-small" },
]

const steps = [
  {
    name: "Gather the channel into playlists",
    text: "INDXR accepts playlist URLs, not channel URLs. Use the channel's own playlists, or save the videos you want into a playlist of your own in YouTube.",
  },
  {
    name: "Extract the playlist into your library",
    text: `Paste the playlist URL into INDXR's Playlist tab. The transcripts are filed into a collection named after the playlist, each with its source and an APA citation. One job takes up to ${MAX_PLAYLIST_VIDEOS_PER_JOB} videos; larger playlists run in batches.`,
  },
  {
    name: "Search the collection",
    text: "The library search looks inside the transcript text, so you can find every video where a term came up, filtered to one collection.",
  },
  {
    name: "Ask Claude or ChatGPT",
    text: "Connect the library to Claude, Claude Code or ChatGPT with the read-only connector. The assistant searches your transcripts and answers with quotes, timestamps and the source.",
  },
  {
    name: "Or build your own pipeline",
    text: "Export RAG JSON, embed the chunks, store them in a vector database and add your own answer layer, when you need search inside your own product.",
  },
]

export default function YouTubeChannelKnowledgeBasePage() {
  return (
    <TutorialTemplate
      category="Deep Dives"
      slug="youtube-channel-knowledge-base"
      title="Turn a YouTube Channel Into a Knowledge Base You Can Search and Ask"
      metaDescription={metaDescription}
      publishedAt="2026-04-16"
      updatedAt="2026-11-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      steps={steps}
    >
      <p>
        YouTube channels are dense archives. A university lecture series, a conference, an educator with
        hundreds of videos: the knowledge is there, but you can only watch it one video at a time. You
        cannot search a hundred lectures for every time a speaker explained a concept, or ask a question
        and get back the exact moment it was answered.
      </p>

      <p>
        There are two ways to fix that. The first needs no code: put the channel&apos;s transcripts in a
        library where each one keeps its source, and let Claude or ChatGPT search them for you. The second
        is to build your own retrieval pipeline with a vector database. This article does the first in
        full, then the second for those who need it.
      </p>

      <h2>Step 1: Gather the channel into playlists</h2>

      <p>
        INDXR accepts playlist URLs, not channel URLs. There are two practical paths.
      </p>

      <p>
        <strong>Use the channel&apos;s own playlists.</strong> Many channels group videos by series, course
        or year. If the channel has those, use their URLs directly. Each one becomes its own collection,
        which keeps a big channel easy to navigate.
      </p>

      <p>
        <strong>Make your own playlist.</strong> Log into YouTube, open the channel, and use &quot;Save to
        playlist&quot; on each video you want. YouTube playlists can be long; INDXR processes up to{" "}
        {MAX_PLAYLIST_VIDEOS_PER_JOB} videos per job and runs a larger list in batches, all into the same
        library. Batching by year or topic also makes the collection easier to update later.
      </p>

      <h2>Step 2: Extract the playlist into your library</h2>

      <p>
        Paste the playlist URL into the{" "}
        <Link href="/articles/youtube-playlist-transcript">Playlist tab</Link>. The review screen lists
        every video&apos;s length and whether you have already processed it. Set each video to YouTube
        captions or AI transcription, and start the job. It runs in the background.
      </p>

      <p>
        The transcripts are filed into a collection named after the playlist. Each one keeps its source: the
        channel, the link, the length, the publication date, and a ready{" "}
        <Link href="/articles/cite-youtube-video-apa">APA 7 citation</Link>. That is what makes the
        knowledge base usable for research rather than just for search.
      </p>

      <p><strong>What it costs for a channel of {EX_VIDEOS} videos averaging {EX_MINUTES} minutes:</strong></p>

      <ul>
        <li>
          On YouTube captions: the first {freeVideos} videos free, then {perCaption} credit each ={" "}
          <strong>{exCaptionCredits} credits</strong> ({creditCostEur(exCaptionCredits)} at {getAnchorPackage().name} pricing)
        </li>
        <li>
          All on AI transcription: {EX_VIDEOS} × {EX_MINUTES} minutes × {perMin} credit per minute ={" "}
          <strong>{exAiCredits.toLocaleString("en")} credits</strong> ({creditCostEur(exAiCredits)} at{" "}
          {getAnchorPackage().name} pricing, {anchorPerCreditText()})
        </li>
      </ul>

      <p>
        Most channels mix the two: captions for videos that have them, AI for the rest or for the ones you
        will quote. This is a one-time cost. Re-running the playlist later skips videos you already have, so
        an update costs only the new videos.
      </p>

      <h2>Step 3: Search the collection</h2>

      <p>
        Library search matches titles and the transcript text itself, so you can find every lecture where a
        term came up, filtered to one collection. Each result opens the transcript at the passage, with the
        timestamp to jump into the video.
      </p>

      <h2>Step 4: Ask Claude or ChatGPT</h2>

      <p>
        Connect the library once, and the assistant can list your collections, search them, read a
        transcript in blocks with timestamps and speaker names, and look up each source with its citation.
        It can only read, never change anything, and the connection is free on every account. Setup takes a
        few minutes: see the <Link href="/docs/guides/ai-assistants">Claude and ChatGPT guide</Link>.
      </p>

      <p>Questions that work well name the collection and ask for evidence:</p>

      <ul>
        <li>&ldquo;Across my Justice collection, where does Sandel discuss consent? Quote him with timestamps.&rdquo;</li>
        <li>&ldquo;How did the speaker&apos;s view on this change between the 2022 and 2025 talks? Cite each video.&rdquo;</li>
        <li>&ldquo;Which videos in this collection mention Rawls? Give me the APA references.&rdquo;</li>
      </ul>

      <AskYourLibrary lead="Each playlist you extract becomes a collection, with every transcript's source and citation kept." />

      <p>
        For most research, writing and study, this is the whole job. You do not need to embed anything or
        run a database: the assistant does the retrieval against your library. More on how that works in{" "}
        <Link href="/articles/claude-chatgpt-own-sources">using Claude or ChatGPT with your own sources</Link>.
      </p>

      <h2>Build your own: the RAG JSON export</h2>

      <p>
        Build your own when you are making something for other people: a search box on your site, a
        chatbot, a pipeline that runs without you. INDXR exports each transcript as RAG JSON at{" "}
        {CREDIT_COSTS.RAG_JSON_PER_10MIN} credit per 10 minutes of video. For the {EX_VIDEOS}-video example
        above that is <strong>{exRagCredits} credits</strong> on top of the transcripts.
      </p>

      <p>
        Each video&apos;s <Link href="/articles/transcript-export-formats">RAG JSON</Link> file contains {defaultChunk}-second
        chunks by default ({otherPresets.join(", ")} second presets are also available) with everything a
        vector database needs:
      </p>

      <pre className="prose-content-pre"><code>{`{
  "metadata": {
    "video_id": "kBdfcR-8hEY",
    "title": "Justice: What's The Right Thing To Do? Episode 01 …",
    "duration_seconds": 3282,
    "extracted_at": "2026-08-27T12:43:09.393Z",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "segment_boundary",
      "total_chunks": 60
    },
    "channel": "Harvard University",
    "language": "en",
    "extraction_method": "youtube_captions"
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "kBdfcR-8hEY_chunk_000",
      "text": "This is a course about Justice and we begin with a story suppose you're the driver of a trolley car, and your trolley car is hurdling down the track at sixty miles an hour …",
      "start_time": 4.2,
      "end_time": 65.08,
      "deep_link": "https://youtu.be/kBdfcR-8hEY?t=4",
      "token_count_estimate": 128,
      "metadata": {
        "video_id": "kBdfcR-8hEY",
        "title": "Justice: What's The Right Thing To Do? Episode 01 …",
        "channel": "Harvard University",
        "chunk_index": 0,
        "start_time": 4.2,
        "end_time": 65.08,
        "language": "en",
        "total_chunks": 60
      }
    }
  ]
}`}</code></pre>

      <p>
        The <code>deep_link</code> field is the key feature for a knowledge base: when your AI system
        retrieves a chunk and uses it to answer a question, it can cite the exact video and timestamp
        rather than just the video title.
      </p>

      <h3>Build the vector index</h3>

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

      <h3>Query in natural language</h3>

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

      <h3>Add an LLM answer layer</h3>

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

      <h2>Keeping the knowledge base current</h2>

      <p>
        For channels that publish regularly, INDXR&apos;s duplicate detection means re-running a playlist
        only processes new videos; existing ones are left out and not charged. The connector reads whatever
        is in your library, so new transcripts are available to Claude or ChatGPT straight away. For your
        own vector index, export the new transcripts and embed them as before.
      </p>

      <p>
        For the research behind the {defaultChunk}-second default chunk size, see{" "}
        <Link href="/articles/chunk-youtube-transcripts-for-rag">How to Chunk YouTube Transcripts for RAG</Link>
        . For credit packages, see <Link href="/pricing">pricing</Link>.
      </p>
    </TutorialTemplate>
  )
}
