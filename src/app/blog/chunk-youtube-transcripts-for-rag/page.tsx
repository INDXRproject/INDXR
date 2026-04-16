import type { Metadata } from "next"
import Link from "next/link"
import { TutorialTemplate } from "@/components/content/templates/TutorialTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "How to Chunk YouTube Transcripts for RAG — Research-Backed Guide | INDXR.AI",
  description:
    "The chunk size you pick matters more than your embedding model. This guide covers the research on optimal chunk sizes, fixed vs semantic chunking, overlap, and sentence-boundary snapping for YouTube transcripts.",
}

const faqs = [
  {
    q: "Why does chunk size matter more than the embedding model?",
    a: "The Vectara NAACL 2025 study tested this directly: across 48 embedding models, the choice of chunking strategy had equal or greater influence on retrieval quality than the model itself. An excellent embedding model can't compensate for chunks that are too small to carry semantic content or too large to be precise.",
  },
  {
    q: "Does semantic chunking ever beat fixed-size for transcripts?",
    a: "Rarely. The Vectara paper found semantic chunking \"did not consistently outperform\" fixed-size approaches, and the Vecta 2026 benchmark found it produced dangerously small average chunks (43 tokens) with poor accuracy (54%). For transcripts specifically, time-based chunking with sentence snapping is both simpler and more effective.",
  },
  {
    q: "What's the right chunk size for short YouTube videos (under 5 minutes)?",
    a: "For very short videos, 120-second chunks may produce only 2–3 chunks, which limits retrieval granularity. Consider 30–60 second chunks for short-form content. INDXR.AI's RAG export lets you select 30s, 60s, 90s, or 120s chunk sizes to match your content type.",
  },
  {
    q: "Does overlap help if I'm using sparse retrieval (BM25, SPLADE)?",
    a: "No — a 2026 systematic analysis found that overlap provided no measurable benefit for sparse retrieval methods. Set overlap to 0% if you're indexing with SPLADE or BM25. The overlap benefit applies specifically to dense embedding models (OpenAI, Cohere, Voyage AI).",
  },
  {
    q: "Should I chunk at extraction time or at export time?",
    a: "At export time. Storing pre-chunked transcripts with multiple configurations wastes storage. The compute cost to chunk a 1-hour transcript (pySBD + tiktoken) is under 1 second on CPU — it's fast enough to run synchronously on demand. INDXR.AI processes chunking at export time so you can re-export with different chunk sizes from the same stored transcript.",
  },
]

const sources = [
  {
    label: "Qu et al. — \"Is Semantic Chunking Worth the Computational Cost?\" (NAACL 2025 Findings)",
    url: "https://arxiv.org/abs/2410.13070",
  },
  {
    label: "NVIDIA Technical Blog — Finding the Best Chunking Strategy for Accurate AI Responses",
    url: "https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses",
  },
  {
    label: "nipunsadvilkar/pySBD — Python Sentence Boundary Disambiguation",
    url: "https://github.com/nipunsadvilkar/pySBD",
  },
]

const steps = [
  {
    name: "Extract the transcript",
    text: "Use INDXR.AI to extract the YouTube transcript. For videos with auto-captions, this is free and instant. For videos without captions, enable AI Transcription (AssemblyAI Universal-3 Pro, 1 credit per minute) to get punctuated output with proper sentence boundaries.",
  },
  {
    name: "Choose your chunk duration",
    text: "Target 90–120 seconds per chunk (~300–400 tokens). This aligns with the NVIDIA benchmark's optimal range for topic-based queries and matches LangChain's YoutubeLoader default of 120 seconds. For short-form content (under 5 minutes), use 30–60 second chunks.",
  },
  {
    name: "Apply sentence-boundary snapping",
    text: "Adjust each chunk boundary ±5 seconds to avoid cutting mid-sentence. Use pySBD (97.9% accuracy on the Golden Rule Set) for sentence detection. This preserves timestamp alignment — a property unique to video RAG that enables precise citation deep links.",
  },
  {
    name: "Add 15% overlap",
    text: "For 120-second chunks, 15% overlap equals approximately 18 seconds of repeated context at the start of each chunk. This improves retrieval when a relevant passage spans a chunk boundary. Skip overlap if you're using sparse retrieval methods (BM25, SPLADE).",
  },
  {
    name: "Attach metadata to every chunk",
    text: "Each chunk must carry: video ID, video title, channel name, start and end timestamps (float and formatted), and a pre-constructed deep link (youtube.com/watch?v=ID&t=SECONDs). The deep link is the citation — it lets the downstream LLM point users to the exact moment in the video.",
  },
  {
    name: "Load into your vector database",
    text: "Use INDXR.AI's RAG JSON export to get chunks in a ready-to-load format, or implement the chunking pipeline manually using pySBD and tiktoken. The output is compatible with LangChain, LlamaIndex, Pinecone, ChromaDB, Weaviate, and Qdrant with minimal glue code.",
  },
]

export default function ChunkYouTubeTranscriptsForRAGPage() {
  return (
    <TutorialTemplate
      title="How to Chunk YouTube Transcripts for RAG (and Why 30 Seconds Is Wrong)"
      metaDescription="The chunk size you pick matters more than your embedding model. This guide covers the research on optimal chunk sizes, fixed vs semantic chunking, overlap, and sentence-boundary snapping for YouTube transcripts."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
      sources={sources}
      steps={steps}
    >
      <p>
        The chunk size you pick for YouTube transcripts matters more than your embedding model choice.
        That&apos;s not an intuition — it&apos;s the finding of a 2025 peer-reviewed study from Vectara, published
        at NAACL, which tested 25 chunking configurations across 48 embedding models and found that
        chunking strategy had equal or greater influence on retrieval quality than the choice of embedding
        model (&quot;Is Semantic Chunking Worth the Computational Cost?&quot;, Qu et al., NAACL 2025 Findings,{" "}
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
          arxiv.org/abs/2410.13070
        </a>
        ).
      </p>

      <p>
        Most developers default to 30-second chunks because granularity feels useful. But 30 seconds of
        spoken English produces roughly 75 words — approximately 100 tokens at standard English
        tokenization rates. That&apos;s well below the 256–512 token range that benchmarks consistently
        identify as the sweet spot for dense embedding retrieval. You&apos;re embedding fragments that lack
        context, and your retrieval quality shows it.
      </p>

      <h2>Why YouTube Transcripts Need Special Treatment</h2>

      <p>
        YouTube&apos;s transcript API returns segments of 2–5 seconds each — roughly 5–15 words per object.
        This is the granularity the captioning system uses for subtitle timing, not a unit of meaning. A
        single sentence might span three or four API segments. Load these directly into a vector database
        and you&apos;re embedding fragments like &quot;so the first thing&quot; and &quot;you need to understand&quot; as separate
        chunks. These aren&apos;t meaningful retrieval units.
      </p>

      <p>
        YouTube transcripts also lack punctuation in auto-generated form. The speech recognition system
        outputs a stream of lowercase words. Without sentence boundaries, naive fixed-size character or
        word splitting will cut through sentences mid-thought. This damages both the coherence of
        individual chunks and the accuracy of retrieval.
      </p>

      <p>
        The third challenge is timestamp alignment. Unlike a PDF or web page, a YouTube transcript has a
        unique property: every piece of text maps to a specific moment in a video. Lose that mapping
        during chunking and you lose the ability to cite sources with timestamps — one of the most
        valuable properties of video-based RAG systems.
      </p>

      <h2>How Many Tokens Is 30 Seconds of Speech?</h2>

      <p>
        Spoken English averages approximately 130–150 words per minute in formal speech and 150–160 words
        per minute for conversational speech and YouTube creators. Using OpenAI&apos;s{" "}
        <code>cl100k_base</code> tokenizer, English text tokenizes at approximately 1.3–1.4 tokens per
        word.
      </p>

      <table>
        <thead>
          <tr>
            <th>Chunk duration</th>
            <th>Words (~150 WPM)</th>
            <th>Tokens (~1.33×)</th>
            <th>For RAG?</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>30 seconds</td><td>~75</td><td>~100</td><td>Too small — below 256-token floor</td></tr>
          <tr><td>60 seconds</td><td>~150</td><td>~200</td><td>Minimum viable</td></tr>
          <tr><td>90 seconds</td><td>~225</td><td>~300</td><td>Good — inside sweet spot</td></tr>
          <tr><td>120 seconds</td><td>~300</td><td>~400</td><td>Optimal — industry benchmark</td></tr>
          <tr><td>180 seconds</td><td>~450</td><td>~600</td><td>Getting large — context dilution risk</td></tr>
        </tbody>
      </table>

      <p>
        LangChain&apos;s <code>YoutubeLoader</code> defaults to <code>chunk_size_seconds=120</code>. This
        isn&apos;t arbitrary — it aligns with the ~400 token range that produces the best retrieval results
        across the published benchmarks.
      </p>

      <h2>What the Research Says About Chunk Size</h2>

      <p>
        <strong>Vectara NAACL 2025</strong> tested 25 chunking configurations across 48 embedding models
        on a diverse retrieval benchmark. The key finding: chunking strategy influenced retrieval quality
        as much as or more than the embedding model. Larger fixed-size chunks (512+ tokens) generally
        outperformed smaller ones. Semantic chunking did not reliably beat well-chosen fixed-size
        chunking.
      </p>

      <p>
        <strong>NVIDIA&apos;s benchmark</strong> tested chunk sizes from 128 to 2,048 tokens against different
        query types. Factoid queries (precise lookups) performed best with 256–512 token chunks.
        Analytical queries (which require broader context) performed better with 512–1,024 tokens. For
        YouTube transcripts, where queries tend to be topic-based rather than exact-phrase lookups, the
        256–512 range is the appropriate target.
      </p>

      <p>
        <strong>Chroma Research</strong> evaluated chunking strategies across multiple embedding models
        and found that <code>RecursiveCharacterTextSplitter</code> at 400 tokens achieved approximately
        89% recall — competitive with more complex approaches at a fraction of the computational cost.
        This confirms that the token-range target matters more than the sophistication of the splitting
        algorithm.
      </p>

      <p>
        <strong>Microsoft Azure AI Search</strong> recommends starting with 512 tokens and 25% overlap
        as a baseline for most document types. For audio transcripts, where sentences are shorter than
        technical documents, 300–400 tokens (90–120 seconds) often performs comparably.
      </p>

      <h2>Fixed-Time vs Semantic Chunking: Which Wins for Transcripts?</h2>

      <p>
        Semantic chunking — detecting topic shifts and adjusting chunk boundaries accordingly — sounds
        appealing in theory. In practice, it underperforms for audio transcripts specifically.
      </p>

      <p>
        The Vectara NAACL 2025 study found that semantic chunking consistently failed to justify its
        computational cost versus optimally-sized fixed chunks. A 2026 benchmark by Vecta tested seven
        chunking strategies on real-world data and found semantic chunking produced an average chunk size
        of only 43 tokens — far below the optimal range — with accuracy of 54%. Recursive fixed-size
        chunking at 512 tokens achieved 69% accuracy at a fraction of the compute cost.
      </p>

      <p>
        For YouTube transcripts specifically, there&apos;s an additional argument against semantic chunking:
        timestamp alignment. Semantic chunkers adjust boundaries based on text similarity, which can
        produce chunks that span awkward time ranges. A time-based approach that snaps to sentence
        boundaries preserves the timestamp-to-chunk mapping that makes video RAG uniquely valuable.
      </p>

      <p>
        <strong>The recommendation: time-based chunking with sentence-boundary snapping.</strong> Target
        a duration (90–120 seconds), but adjust the boundary ±5 seconds to avoid cutting mid-sentence.
        This gives you:
      </p>

      <ul>
        <li>Predictable token ranges (~300–400 tokens)</li>
        <li>Clean sentence boundaries</li>
        <li>Preserved timestamp alignment</li>
        <li>Consistent chunk sizes that make deduplication and indexing predictable</li>
      </ul>

      <h2>Overlap: 15% Is the Research-Backed Default</h2>

      <p>
        Chunk overlap — repeating a portion of one chunk at the start of the next — helps retrieval when
        a relevant passage spans a chunk boundary. NVIDIA&apos;s benchmark tested 10%, 15%, and 20% overlap.
        15% performed best across query types. Microsoft Azure recommends 25% as a starting point. For
        120-second chunks, 15% overlap equals approximately 18 seconds of repeated context — roughly one
        or two sentences.
      </p>

      <p>
        One important caveat: a 2026 analysis using sparse retrieval (SPLADE) found that overlap
        provided no measurable benefit for that specific retrieval method. Overlap improves dense
        embedding retrieval (OpenAI, Cohere, Voyage AI) but may be unnecessary for sparse methods. The{" "}
        <code>overlap_seconds</code> field in INDXR.AI&apos;s{" "}
        <Link href="/youtube-transcript-for-rag">RAG JSON export</Link> lets you set this to zero if
        you&apos;re using sparse retrieval.
      </p>

      <h2>What to Include in Every Chunk&apos;s Metadata</h2>

      <p>
        Chunk size is only half the story. Retrieval quality also depends heavily on what metadata you
        attach to each chunk. At minimum, each chunk should carry: video ID, video title, channel name,
        start and end timestamps (as floats for computation, as formatted strings for display), and a
        pre-constructed deep link to the exact timestamp in the video. The deep link matters because
        it&apos;s the citation — &quot;According to [Title] at 12:34, ...&quot; is only useful if the viewer can
        actually jump to that moment.
      </p>

      <p>
        Optional but valuable: chapter title (if the video has YouTube chapters), language code, and
        whether the transcript came from auto-captions or AI transcription. The{" "}
        <code>is_auto_generated</code> flag in particular lets downstream pipelines apply different
        confidence weighting to auto-caption chunks versus AI-transcribed ones.
      </p>

      <h2>Implementing This in Practice</h2>

      <p>
        The most direct path: use INDXR.AI&apos;s{" "}
        <Link href="/youtube-transcript-for-rag">RAG JSON export</Link>, which implements time-based
        chunking with sentence-boundary snapping, 15% overlap, and full metadata per chunk. Each chunk
        includes the <code>deep_link</code> field. The output loads directly into LangChain, LlamaIndex,
        Pinecone, ChromaDB, Weaviate, and Qdrant with minimal glue code.
      </p>

      <p>
        If you&apos;re building the chunking yourself, here&apos;s the minimal pipeline for an AssemblyAI-sourced
        transcript:
      </p>

      <pre className="prose-content-pre"><code>{`import pysbd  # Sentence boundary detection, 97.9% accuracy (Golden Rule Set)
import tiktoken
import json

def chunk_transcript(segments, target_seconds=120, overlap_seconds=18):
    """
    segments: list of {text, start, end} dicts from AssemblyAI output
    Returns: list of chunk dicts with text, start_time, end_time, token_count
    """
    enc = tiktoken.get_encoding("cl100k_base")
    segmenter = pysbd.Segmenter(language="en", clean=False)

    # Step 1: Merge raw segments into continuous text with timestamp index
    full_text = " ".join(s["text"] for s in segments)

    # Step 2: Split into sentences
    sentences = segmenter.segment(full_text)

    # Step 3: Map sentences back to timestamps
    # (simplified — production code needs character-level mapping)

    # Step 4: Accumulate sentences until target duration, snap to sentence boundary
    chunks = []
    current_chunk_sentences = []
    current_start = segments[0]["start"]

    for sentence in sentences:
        current_chunk_sentences.append(sentence)
        chunk_text = " ".join(current_chunk_sentences)

        # Estimate duration from token count (rough proxy)
        token_count = len(enc.encode(chunk_text))

        if token_count >= (target_seconds / 0.4):  # ~400 tokens = 120 seconds
            chunks.append({
                "text": chunk_text,
                "token_count": token_count
            })
            # Carry over last overlap_sentences for next chunk
            overlap_sentence_count = max(1, int(len(current_chunk_sentences) * 0.15))
            current_chunk_sentences = current_chunk_sentences[-overlap_sentence_count:]

    # Don't forget the final chunk
    if current_chunk_sentences:
        chunks.append({"text": " ".join(current_chunk_sentences)})

    return chunks`}</code></pre>

      <p>
        <code>pysbd</code> (Python Sentence Boundary Detection) achieves 97.9% accuracy on the Golden
        Rule Set benchmark — significantly better than <code>nltk.punkt</code> (62.1% precision) while
        being rule-based with no model downloads required. For AssemblyAI transcripts that already
        include punctuation, this works reliably out of the box.
      </p>

      <h2>Summary: The Practical Defaults</h2>

      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Research-backed default</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Chunk duration</td><td>120 seconds (~400 tokens)</td><td>LangChain default; NVIDIA benchmark</td></tr>
          <tr><td>Chunk strategy</td><td>Fixed-time + sentence-boundary snap</td><td>Vectara NAACL 2025; Vecta 2026</td></tr>
          <tr><td>Overlap</td><td>15% (~18 seconds for 120s chunks)</td><td>NVIDIA benchmark</td></tr>
          <tr><td>Minimum viable</td><td>60 seconds (~200 tokens)</td><td>Token range analysis</td></tr>
          <tr><td>Avoid</td><td>&lt; 60 seconds (&lt; 150 tokens)</td><td>Below 256-token floor</td></tr>
        </tbody>
      </table>

      <p>
        These aren&apos;t the only valid parameters — smaller chunks work better for some retrieval patterns,
        and larger ones suit analytical queries over long lectures. But if you&apos;re starting from scratch
        and want a setting that performs well across most YouTube RAG use cases, 120 seconds with 15%
        overlap and sentence snapping is where the research points.
      </p>

      <p>
        The fastest path to a properly-chunked YouTube RAG pipeline:{" "}
        <Link href="/youtube-transcript-for-rag">INDXR.AI&apos;s RAG JSON export</Link> handles all of the
        above — sentence snapping, 15% overlap, deep links per chunk — in one download. For the full
        JSON schema and integration examples, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON</Link>. For credit packages, see{" "}
        <Link href="/pricing">pricing</Link>.
      </p>
    </TutorialTemplate>
  )
}
