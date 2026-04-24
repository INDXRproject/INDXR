import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript JSON Export — What You Actually Get | INDXR.AI",
  description:
    "Export YouTube transcripts as structured JSON with video metadata, start/end timestamps, and channel info. Free for captioned videos. Real schema, real output, no surprises.",
}

const faqs = [
  {
    q: "Is standard JSON always free?",
    a: "Yes. Caption-based extraction is free, and the standard JSON export adds no credit cost on top. You pay only for AI Transcription (1 credit/min) and RAG JSON (1 credit/15 min).",
  },
  {
    q: "Does this work for audio files I upload myself?",
    a: "Yes. Upload MP3, MP4, WAV, M4A, OGG, FLAC, WEBM up to 500MB. Standard JSON and RAG JSON are both available after transcription. channel and language will be null since there's no YouTube metadata to fetch.",
  },
  {
    q: "What's the difference between standard JSON and RAG JSON?",
    a: "Standard JSON gives you 2–5 second segments — the raw caption timing. RAG JSON merges those into configurable chunks (30s–120s) with overlap, per-chunk deep links, token count estimates, and flat metadata. Standard JSON is a data format. RAG JSON is a pipeline-ready input.",
  },
  {
    q: "Does AI Transcription improve accuracy for English?",
    a: "Yes. AssemblyAI Universal-3 Pro outperforms YouTube auto-captions for accuracy, particularly with accents, fast speech, and domain-specific vocabulary. The bigger difference is punctuation — AssemblyAI adds it, auto-captions don't.",
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
    label: "AssemblyAI Universal-3 Pro — speech-to-text model",
    url: "https://www.assemblyai.com/universal-3",
  },
  {
    label: "LangChain YoutubeLoader — document loader docs",
    url: "https://python.langchain.com/docs/integrations/document_loaders/youtube_transcript",
  },
  {
    label: "Pinecone — Filter with metadata",
    url: "https://docs.pinecone.io/guides/data/filter-with-metadata",
  },
  {
    label: "ChromaDB — documentation",
    url: "https://docs.trychroma.com",
  },
]

export default function YouTubeTranscriptJsonPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcript JSON Export — What You Actually Get"
      metaDescription="Export YouTube transcripts as structured JSON with video metadata, start/end timestamps, and channel info. Free for captioned videos. Real schema, real output, no surprises."
      publishedAt="2026-04-16"
      updatedAt="2026-04-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        If you&apos;ve worked with YouTube transcript data programmatically, you know the frustration. The
        raw output from{" "}
        <a
          href="https://pypi.org/project/youtube-transcript-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          youtube-transcript-api
        </a>{" "}
        — the most-used library for this — looks like this:
      </p>

      <pre className="prose-content-pre"><code>{`[
  {"text": "everybody needs to learn to code", "start": 1.91, "duration": 2.1},
  {"text": "coding is the new literacy", "start": 4.01, "duration": 1.8}
]`}</code></pre>

      <p>
        No video title. No channel. No language. No end timestamp. Just fragments. You spend the next
        hour writing boilerplate to reconstruct what you actually need.
      </p>

      <p>
        INDXR.AI exports transcripts as structured JSON with the metadata already in place. Here&apos;s
        exactly what you get and what it costs — no features described that aren&apos;t actually in the
        output.
      </p>

      <h2>Standard JSON — Free for Captioned Videos</h2>

      <p>
        For any YouTube video with auto-generated captions, the standard JSON export is free.
      </p>

      <p>
        Here&apos;s the actual output, taken from a real export of Fireship&apos;s{" "}
        <em>How to Learn to Code</em> (6.75 min):
      </p>

      <pre className="prose-content-pre"><code>{`{
  "metadata": {
    "video_id": "NtfbWkxJTHw",
    "title": "How to Learn to Code - 8 Hard Truths",
    "channel": "Fireship",
    "language": "en",
    "published_at": "2022-02-09",
    "duration_seconds": 405,
    "extraction_method": "youtube_captions",
    "extracted_at": "2026-04-23T18:38:07.820Z"
  },
  "segments": [
    {
      "text": "everybody needs to learn to code coding is the new literacy",
      "start_time": 1.91,
      "end_time": 4.01
    },
    {
      "text": "if you can't code you'll soon become obsolete",
      "start_time": 4.01,
      "end_time": 6.32
    }
  ]
}`}</code></pre>

      <p>
        Every segment has <code>start_time</code> and <code>end_time</code> — calculated from the raw
        caption timing. The metadata wrapper includes the video title, channel, language, and publish
        date, extracted automatically from YouTube&apos;s data.
      </p>

      <p>
        <strong>The honest limitation with auto-captions:</strong> The text arrives as a stream of
        lowercase words with no punctuation. Notice{" "}
        <em>&quot;everybody needs to learn to code coding is the new literacy&quot;</em> — no
        capitalization, no period. This is a YouTube limitation, not ours. For most data processing
        purposes it&apos;s workable. For anything that presents text to users or needs sentence
        boundaries for downstream NLP, it&apos;s a meaningful quality gap.
      </p>

      <p>
        <strong>For non-English videos:</strong> YouTube&apos;s captioning system always returns the
        English translation via our extraction pipeline, regardless of the video&apos;s original
        language. If you need the original Arabic, Turkish, Spanish, or Portuguese text, use AI
        Transcription instead — it transcribes the actual audio in the original language.
      </p>

      <p>
        <strong>Cost: Free.</strong> No credits, no account required for a single video.
      </p>

      <h2>AI Transcription + Standard JSON — 1 Credit Per Minute</h2>

      <p>
        When you enable AI Transcription, INDXR.AI downloads the video audio and runs it through{" "}
        <a
          href="https://www.assemblyai.com/universal-3"
          target="_blank"
          rel="noopener noreferrer"
        >
          AssemblyAI Universal-3 Pro
        </a>
        . The output format is identical — same metadata wrapper, same segments array — but the text
        quality changes substantially.
      </p>

      <p>Here&apos;s what changes in the segments:</p>

      <pre className="prose-content-pre"><code>{`{
  "segments": [
    {
      "text": "This is a 3. It's sloppily written and rendered at an extremely low resolution of 28x28 pixels, but your brain has no trouble recognizing it as a 3.",
      "start_time": 4.434,
      "end_time": 10.315
    }
  ]
}`}</code></pre>

      <p>
        Proper capitalization. Proper punctuation. Sentence boundaries. This is from 3Blue1Brown&apos;s
        neural networks video — the same content that auto-captions would give you as an unpunctuated
        lowercase stream.
      </p>

      <p>The difference matters for three specific situations:</p>

      <p>
        First, AI Transcription works for videos without captions at all. Roughly 20% of YouTube
        videos have no auto-generated captions. For these, it&apos;s the only option.
      </p>

      <p>
        Second, AssemblyAI is more accurate than YouTube auto-captions for English and other supported
        languages — particularly with accents, fast speech, and technical vocabulary.
      </p>

      <p>
        Third, if you&apos;re building a RAG pipeline, punctuated text with sentence boundaries enables
        sentence-level chunking. Without punctuation, chunkers cut through sentences arbitrarily.
      </p>

      <p>
        <strong>Cost: 1 credit per minute, minimum 1 credit.</strong>
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
            <th>Cost at Basic (€6.99/500cr)</th>
            <th>Cost at Plus (€13.99/1,200cr)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10 min</td>
            <td>10</td>
            <td>€0.14</td>
            <td>€0.12</td>
          </tr>
          <tr>
            <td>30 min</td>
            <td>30</td>
            <td>€0.42</td>
            <td>€0.35</td>
          </tr>
          <tr>
            <td>1 hour</td>
            <td>60</td>
            <td>€0.84</td>
            <td>€0.70</td>
          </tr>
          <tr>
            <td>2 hours</td>
            <td>120</td>
            <td>€1.68</td>
            <td>€1.40</td>
          </tr>
        </tbody>
      </table>

      <h2>RAG JSON — For Vector Databases and AI Pipelines</h2>

      <p>
        If you&apos;re loading transcripts into a vector database or building a
        retrieval-augmented pipeline, the standard JSON format isn&apos;t what you want. The 2–5
        second segments are too small for embedding — each fragment contains roughly 8–20 tokens,
        far below the 200–400 token range where embedding models perform best (
        <a
          href="https://arxiv.org/abs/2410.13070"
          target="_blank"
          rel="noopener noreferrer"
        >
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
        ).
      </p>

      <p>
        RAG JSON handles that transformation. It merges segments into configurable chunks (30s / 60s
        / 90s / 120s), adds sentence-boundary overlap, and attaches per-chunk metadata ready for
        direct vector database upsert.
      </p>

      <p>
        Here&apos;s a real chunk from the Andrej Karpathy <em>Let&apos;s build GPT</em> video (1h56m, 90s
        preset):
      </p>

      <pre className="prose-content-pre"><code>{`{
  "chunk_index": 0,
  "chunk_id": "kCc8FmEb1nY_chunk_000",
  "text": "hi everyone so by now you have probably heard of chat GPT it has taken the world and AI Community by storm...",
  "start_time": 2.51,
  "end_time": 93.439,
  "deep_link": "https://youtu.be/kCc8FmEb1nY?t=2",
  "token_count_estimate": 404,
  "metadata": {
    "video_id": "kCc8FmEb1nY",
    "title": "Let's build GPT: from scratch, in code, spelled out.",
    "channel": "Andrej Karpathy",
    "chunk_index": 0,
    "total_chunks": 89,
    "start_time": 2.51,
    "end_time": 93.439,
    "language": "en"
  }
}`}</code></pre>

      <p>
        The <code>deep_link</code> field is pre-constructed and points to the exact second the chunk
        starts. The <code>metadata</code> object is flat — the structure{" "}
        <a href="https://docs.pinecone.io/guides/data/filter-with-metadata" target="_blank" rel="noopener noreferrer">
          Pinecone
        </a>{" "}
        and{" "}
        <a href="https://docs.trychroma.com" target="_blank" rel="noopener noreferrer">
          ChromaDB
        </a>{" "}
        require for filtering.
      </p>

      <p>
        <strong>What you should know:</strong> RAG JSON on auto-captions works, but the overlap
        strategy differs from AssemblyAI. Without punctuation, we can&apos;t detect sentence
        boundaries, so overlap uses segment-level alignment instead. The result is still useful, but
        AssemblyAI-sourced transcripts produce cleaner chunks with true sentence boundaries. This is
        reflected in the <code>overlap_strategy</code> field in the output:{" "}
        <code>&quot;sentence_boundary&quot;</code> for AssemblyAI,{" "}
        <code>&quot;segment_boundary&quot;</code> for auto-captions.
      </p>

      <p>
        <strong>Cost: 1 credit per 15 minutes of video, minimum 1 credit.</strong>
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
          <tr><td>61–120 min</td><td>8 credits</td></tr>
          <tr><td>2+ hours</td><td>1 credit per 15 min</td></tr>
        </tbody>
      </table>

      <p>
        The first 3 RAG exports are free. Credits never expire.
      </p>

      <h2>What You&apos;d Add Yourself</h2>

      <p>
        The output doesn&apos;t include everything some pipelines want. Specifically:{" "}
        <code>channel</code> and <code>language</code> are not available for audio uploads (only
        YouTube video extraction), since those fields come from YouTube&apos;s metadata. If you need
        formatted timestamps (<code>&quot;00:01:32&quot;</code>) rather than float seconds, construct
        them from <code>start_time</code>. If you need a YouTube deep link and you already have the
        video ID, it&apos;s{" "}
        <code>https://youtu.be/&#123;video_id&#125;?t=&#123;Math.floor(start_time)&#125;</code> —
        the same formula we use.
      </p>

      <p>
        For the full RAG-optimized export with chunking, overlap configuration, and LangChain / Pinecone
        integration examples, see{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link>. For
        audio file uploads, see <Link href="/audio-to-text">Audio Upload</Link>. For credit packages,
        see the <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
