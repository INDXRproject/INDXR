import type { Metadata } from "next"
import Link from "next/link"
import { TutorialTemplate } from "@/components/content/templates/TutorialTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "How to Chunk YouTube Transcripts for RAG — Research-Backed Guide | INDXR.AI",
  description:
    "The chunk size you pick matters more than your embedding model. Research-backed guide covering optimal sizes, overlap, sentence-boundary snapping, and why 30 seconds is wrong.",
}

const faqs = [
  {
    q: "Why does chunk size matter more than the embedding model?",
    a: "The Vectara NAACL 2025 study tested this directly. An excellent embedding model can't compensate for chunks too small to carry semantic content.",
  },
  {
    q: "Does semantic chunking ever beat fixed-size for transcripts?",
    a: "Rarely. The Vectara paper found it didn't consistently outperform. The Vecta 2026 benchmark found it produced dangerously small fragments (43 tokens average) with poor accuracy. For transcripts, fixed-time with sentence snapping is both simpler and more effective.",
  },
  {
    q: "What chunk size for videos under 5 minutes?",
    a: "Consider 30s. With 120s chunks, a 5-minute video produces only 2–3 chunks, which limits retrieval granularity.",
  },
  {
    q: "Does overlap help with sparse retrieval?",
    a: "No. Set it to 0% for BM25 or SPLADE. Overlap benefits dense embedding models specifically.",
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
    label: "Chroma Research — Evaluating Chunking Strategies for Retrieval",
    url: "https://research.trychroma.com/evaluating-chunking",
  },
  {
    label: "Microsoft Azure AI Search — How to chunk documents for vector search",
    url: "https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents",
  },
  {
    label: "Vecta 2026 — We Benchmarked 7 Chunking Strategies, Most Advice Was Wrong",
    url: "https://runvecta.com/blog/we-benchmarked-7-chunking-strategies-most-advice-was-wrong",
  },
  {
    label: "nipunsadvilkar/pySBD — Python Sentence Boundary Disambiguation",
    url: "https://github.com/nipunsadvilkar/pySBD",
  },
  {
    label: "LangChain YoutubeLoader — chunk_size_seconds default",
    url: "https://python.langchain.com/docs/integrations/document_loaders/youtube_transcript",
  },
  {
    label: "openai/tiktoken — fast BPE tokeniser for OpenAI models",
    url: "https://github.com/openai/tiktoken",
  },
]

const steps = [
  {
    name: "Extract the transcript",
    text: "Use INDXR.AI to extract the YouTube transcript. For videos with auto-captions, this is free and instant. For videos without captions or for non-English content, enable AI Transcription (AssemblyAI Universal-3 Pro, 1 credit per minute) to get punctuated output with proper sentence boundaries.",
  },
  {
    name: "Choose your chunk duration",
    text: "Target 60–90 seconds per chunk (~200–300 tokens) for most use cases, or 120 seconds (~400 tokens) for lectures and long-form analysis. INDXR.AI's RAG JSON export offers 30s, 60s, 90s, and 120s presets.",
  },
  {
    name: "Apply sentence-boundary snapping",
    text: "Adjust each chunk boundary to land on a complete sentence. For AssemblyAI transcripts (punctuation present), sentence-boundary detection runs automatically. For auto-captions (no punctuation), segment-boundary overlap is used as the fallback.",
  },
  {
    name: "Add 15% overlap",
    text: "For 60-second chunks, 15% overlap equals 9 seconds. For 120-second chunks, 18 seconds. Skip overlap if you're using sparse retrieval (BM25, SPLADE) — it provides no measurable benefit there.",
  },
  {
    name: "Attach flat metadata to every chunk",
    text: "Each chunk must carry: video_id, title, channel, start_time, end_time, chunk_index, total_chunks, language, and a pre-constructed deep_link. The flat structure is required by vector databases (Pinecone, ChromaDB, Weaviate, Qdrant) for metadata filtering.",
  },
  {
    name: "Load into your vector database",
    text: "INDXR.AI's RAG JSON export produces a ready-to-load file. Each chunk's metadata object loads directly into Pinecone, ChromaDB, Weaviate, and Qdrant without transformation.",
  },
]

export default function ChunkYouTubeTranscriptsForRAGPage() {
  return (
    <TutorialTemplate
      title="How to Chunk YouTube Transcripts for RAG (and Why 30 Seconds Is Wrong)"
      metaDescription="The chunk size you pick matters more than your embedding model. Research-backed guide covering optimal sizes, overlap, sentence-boundary snapping, and why 30 seconds is wrong."
      publishedAt="2026-04-16"
      updatedAt="2026-04-24"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
      sources={sources}
      steps={steps}
    >
      <p>
        The chunk size you pick for YouTube transcripts matters more than your embedding model. That&apos;s
        the finding of a 2025 peer-reviewed study from Vectara, published at NAACL, which tested 25
        chunking configurations across 48 embedding models (
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
          arxiv.org/abs/2410.13070
        </a>
        ). Chunking strategy had equal or greater influence on retrieval quality than model choice.
      </p>

      <p>
        Most developers default to 30 seconds because granularity feels useful. Thirty seconds of spoken
        English produces roughly 75 words — approximately 100 tokens. That&apos;s below the 256-token floor
        where embedding models start to produce semantically meaningful vectors. You&apos;re embedding
        fragments, and your retrieval quality reflects it.
      </p>

      <h2>How Many Tokens Is 30 Seconds of Speech?</h2>

      <p>
        Spoken English averages 130–160 words per minute. YouTube creators trend toward the faster end.
        Using{" "}
        <a href="https://github.com/openai/tiktoken" target="_blank" rel="noopener noreferrer">
          OpenAI&apos;s cl100k_base tokenizer
        </a>{" "}
        (~1.33 tokens per word):
      </p>

      <table>
        <thead>
          <tr>
            <th>Duration</th>
            <th>Words (~150 WPM)</th>
            <th>Tokens</th>
            <th>For RAG?</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>30s</td><td>~75</td><td>~100</td><td>❌ Below 256-token floor</td></tr>
          <tr><td>60s</td><td>~150</td><td>~200</td><td>⚠️ Minimum viable</td></tr>
          <tr><td>90s</td><td>~225</td><td>~300</td><td>✅ Inside sweet spot</td></tr>
          <tr><td>120s</td><td>~300</td><td>~400</td><td>✅ Research-backed optimum</td></tr>
        </tbody>
      </table>

      <p>
        <a
          href="https://python.langchain.com/docs/integrations/document_loaders/youtube_transcript"
          target="_blank"
          rel="noopener noreferrer"
        >
          LangChain&apos;s YoutubeLoader
        </a>{" "}
        defaults to <code>chunk_size_seconds=120</code> for exactly this reason. INDXR.AI offers 30s,
        60s, 90s, and 120s presets — the 30s option exists for short-form content and granular
        navigation, but for most RAG workloads 60s or above is the right starting point.
      </p>

      <h2>What the Research Says</h2>

      <p>
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
          Vectara NAACL 2025
        </a>{" "}
        tested 25 chunking configurations across 48 embedding models. Key finding: chunking strategy
        influenced retrieval quality as much as or more than the embedding model. Larger fixed-size
        chunks generally outperformed smaller ones. Semantic chunking did not reliably beat
        well-chosen fixed-size chunking.
      </p>

      <p>
        <a
          href="https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses"
          target="_blank"
          rel="noopener noreferrer"
        >
          NVIDIA&apos;s benchmark
        </a>{" "}
        tested 128 to 2,048 tokens across query types. Factoid queries performed best at 256–512
        tokens. Analytical queries performed better at 512–1,024 tokens. For YouTube transcripts,
        where queries tend to be topic-based, 256–512 tokens — the 60–90 second range — is the
        appropriate target.
      </p>

      <p>
        <a
          href="https://research.trychroma.com/evaluating-chunking"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chroma Research
        </a>{" "}
        found that RecursiveCharacterTextSplitter at 400 tokens achieved ~89% recall — competitive
        with more complex approaches at a fraction of the cost. Token-range target matters more than
        algorithm sophistication.
      </p>

      <p>
        <a
          href="https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents"
          target="_blank"
          rel="noopener noreferrer"
        >
          Microsoft Azure AI Search
        </a>{" "}
        recommends 512 tokens with 25% overlap as a baseline. For audio transcripts with shorter
        sentences, 300–400 tokens (90–120 seconds) often performs comparably.
      </p>

      <h2>Fixed-Time vs. Semantic Chunking</h2>

      <p>
        Semantic chunking detects topic shifts and adjusts boundaries accordingly. For audio
        transcripts specifically, it underperforms.
      </p>

      <p>
        The Vectara paper found semantic chunking failed to justify its computational cost. A{" "}
        <a
          href="https://runvecta.com/blog/we-benchmarked-7-chunking-strategies-most-advice-was-wrong"
          target="_blank"
          rel="noopener noreferrer"
        >
          2026 benchmark by Vecta
        </a>{" "}
        found semantic chunking produced an average chunk size of only 43 tokens — far below optimal
        — with 54% accuracy. Fixed-size chunking at 512 tokens achieved 69% accuracy at a fraction
        of the compute.
      </p>

      <p>
        For transcripts, there&apos;s an additional reason to prefer fixed-time: timestamp alignment.
        Semantic chunkers adjust boundaries based on text similarity, which can produce chunks that
        span awkward time ranges and break the clean mapping between text and video timestamp. Lose
        that mapping and you lose the ability to cite sources with deep links — one of the most
        valuable things about video-based RAG.
      </p>

      <p>
        <strong>
          The approach that works: time-based chunking with sentence-boundary snapping.
        </strong>{" "}
        Target a duration, but adjust the boundary to land on a complete sentence. This gives you
        predictable token ranges, clean sentence boundaries, and preserved timestamps.
      </p>

      <h2>Overlap: 15% Is the Research-Backed Default</h2>

      <p>
        Overlap repeats a portion of one chunk at the start of the next, helping retrieval when a
        relevant passage spans a boundary.
      </p>

      <p>
        NVIDIA tested 10%, 15%, and 20% overlap. 15% performed best for dense embedding retrieval.
        Microsoft Azure recommends 25% as a conservative starting point. For 60-second chunks, 15%
        overlap is 9 seconds. For 120-second chunks, it&apos;s 18 seconds — roughly one to two sentences
        carried over.
      </p>

      <p>
        One important caveat: a 2026 analysis using SPLADE sparse retrieval found overlap provided no
        measurable benefit for sparse methods. If you&apos;re using BM25 or SPLADE, set overlap to 0%.
        The <code>overlap_seconds</code> field in INDXR.AI&apos;s output tells you what was applied so you
        can deduplicate if needed.
      </p>

      <h2>Why Transcript Source Quality Affects Chunking</h2>

      <p>
        Auto-generated YouTube captions have no punctuation. Text arrives as lowercase words without
        sentence boundaries. This affects chunking in two ways.
      </p>

      <p>
        First, sentence-boundary snapping requires sentences — which requires punctuation. Without it,
        chunk edges are arbitrary cuts through the text stream.
      </p>

      <p>
        Second, accuracy varies significantly. Auto-captions achieve 60–95% word accuracy depending
        on audio quality. Errors propagate into embeddings. A misheard technical term becomes a poor
        retrieval anchor.
      </p>

      <p>
        AssemblyAI transcription adds punctuation and capitalization, improves accuracy — particularly
        for accents, fast speech, and technical vocabulary — and enables sentence-level overlap via{" "}
        <a href="https://github.com/nipunsadvilkar/pySBD" target="_blank" rel="noopener noreferrer">
          sentence boundary detection
        </a>
        . For RAG pipelines where retrieval quality matters, the source transcript quality is part of
        the chunking equation.
      </p>

      <h2>The Practical Defaults</h2>

      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Recommended default</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chunk duration</td>
            <td>60–90s</td>
            <td>Token range analysis; NVIDIA benchmark</td>
          </tr>
          <tr>
            <td>Strategy</td>
            <td>Fixed-time + sentence-boundary snap</td>
            <td>Vectara NAACL 2025</td>
          </tr>
          <tr>
            <td>Overlap</td>
            <td>15%</td>
            <td>NVIDIA benchmark</td>
          </tr>
          <tr>
            <td>Avoid</td>
            <td>Under 60s for most workloads</td>
            <td>Below 200-token threshold</td>
          </tr>
        </tbody>
      </table>

      <p>
        These aren&apos;t universal rules. Short-form content (under 5 minutes) may benefit from 30s
        chunks for granularity. Analytical queries over long lectures may benefit from 120s. Start at
        60s and adjust based on your retrieval quality.
      </p>

      <p>
        INDXR.AI&apos;s{" "}
        <Link href="/youtube-transcript-for-rag">RAG JSON export</Link> handles the chunking, overlap,
        and metadata — download and load directly into your vector database. For the full output
        schema, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON Export</Link>. For credit
        packages, see the <Link href="/pricing">pricing page</Link>.
      </p>
    </TutorialTemplate>
  )
}
