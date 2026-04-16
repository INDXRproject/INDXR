import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript JSON Export — Free Auto-Captions to RAG-Ready Output | INDXR.AI",
  description:
    "Export YouTube transcripts as structured JSON with metadata wrapper, start/end timestamps, and video context. Free for auto-caption videos. AI transcription and RAG-optimized chunking available.",
}

const faqs = [
  {
    q: "Is standard JSON export always free?",
    a: "Yes. Standard JSON export from auto-caption videos has no additional credit cost beyond the base extraction, which is free for captioned videos. You pay credits only for AI Transcription (1 credit/minute) and RAG JSON export (1 credit per 15 minutes). A free account with 25 welcome credits lets you test both.",
  },
  {
    q: "When does it make sense to pay for AI Transcription over free auto-captions?",
    a: "Three situations: (1) the video has no auto-captions at all, (2) you need proper punctuation for downstream text processing or user-facing display, or (3) you're building a RAG pipeline where sentence-boundary chunking quality matters. For quick data extraction where you're doing your own text processing anyway, free auto-captions are often fine.",
  },
  {
    q: "What's the total cost for a 1-hour video with maximum quality output?",
    a: "AI Transcription + RAG JSON export: 60 credits + 4 credits = 64 credits. At Plus pricing (€13.99/1,200 credits), that's €0.77. At Basic pricing (€6.99/500 credits), it's €0.89. Credits never expire.",
  },
  {
    q: "Does JSON export work for audio files I upload myself?",
    a: "Yes. Upload any audio or video file via the Audio Upload tab (MP3, MP4, WAV, M4A, OGG, FLAC, WEBM, up to 500MB). The same JSON export options apply — standard JSON and RAG JSON both available after transcription completes.",
  },
  {
    q: "Can I export as JSONL instead of JSON?",
    a: "Yes. JSONL (one JSON object per line) is available as an alternative to the standard JSON array. This format is what OpenAI's fine-tuning API and Hugging Face datasets expect for ML pipeline ingestion.",
  },
  {
    q: "What if I want to process multiple videos and get one combined JSON file?",
    a: "For playlists: extract the playlist, then use the bulk export with merge option to get all transcripts as a single JSON array. Each segment carries video_id and title in the metadata so you can distinguish sources in your downstream pipeline.",
  },
]

const sources = [
  {
    label: "youtube-transcript-api — PyPI",
    url: "https://pypi.org/project/youtube-transcript-api",
  },
  {
    label: "YouTube Help — Auto-captions languages and processing",
    url: "https://support.google.com/youtube/answer/6373554",
  },
  {
    label: "Rev.com — AI transcription pricing",
    url: "https://www.rev.com/services/automatic-transcription",
  },
]

export default function YouTubeTranscriptJsonPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcript JSON Export — Structured Data for Developers"
      metaDescription="Export YouTube transcripts as structured JSON with metadata wrapper, start/end timestamps, and video context. Free for auto-caption videos. AI transcription and RAG-optimized chunking available."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        If you&apos;ve ever worked with YouTube transcript data programmatically, you know the problem: you
        extract the text, you get an array of 2–5 second fragments with no video title, no channel, no
        language, no end timestamp, no context. You spend the next hour writing boilerplate to add
        metadata, calculate end times, merge short segments, and figure out which video these fragments
        even came from.
      </p>

      <p>
        INDXR.AI exports YouTube transcripts as structured JSON with a metadata wrapper built in.
        Auto-caption extraction is free. For better quality — proper punctuation, higher accuracy, cleanly
        segmented text — AI transcription is available at a per-minute cost. For developers building RAG
        pipelines or vector databases, a RAG-optimized variant chunks the transcript into embedding-ready
        segments with deep links and flat metadata per chunk.
      </p>

      <h2>Option 1: Auto-Captions + Standard JSON — Free</h2>

      <p>
        For any YouTube video with auto-generated captions, JSON export is free. No account required for a
        single video; a free account removes the daily rate limit.
      </p>

      <p><strong>What you get:</strong></p>

      <pre className="prose-content-pre"><code>{`{
  "video": {
    "video_id": "dQw4w9WgXcQ",
    "title": "How to Build a RAG Pipeline",
    "channel": "AI Engineering Weekly",
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration": 3612,
    "language": "en",
    "is_auto_generated": true,
    "transcript_source": "youtube_captions"
  },
  "segments": [
    {
      "text": "hello everyone welcome to this tutorial",
      "start": 0.0,
      "end": 2.1,
      "duration": 2.1
    },
    {
      "text": "today we're going to build a complete rag pipeline",
      "start": 2.1,
      "end": 5.4,
      "duration": 3.3
    }
  ]
}`}</code></pre>

      <p>
        <strong>The honest limitation:</strong> Auto-generated captions lack punctuation and
        capitalization. The text arrives as a continuous stream of lowercase words. Notice{" "}
        <code>&quot;hello everyone welcome to this tutorial&quot;</code> — no capital, no period. For a quick
        data extraction or a pipeline that processes the text further, this may be fine. For anything that
        presents the text to users, generates citations, or relies on sentence detection for downstream
        processing (like RAG chunking), this is a meaningful quality gap.
      </p>

      <p>
        <code>is_auto_generated: true</code> in the output flags this so your code can handle it
        differently from higher-quality sources.
      </p>

      <p>
        <strong>Cost: Free.</strong> Standard JSON export is included at no credit cost for any transcript
        extraction.
      </p>

      <h2>Option 2: AI Transcription + Standard JSON — 1 Credit Per Minute</h2>

      <p>
        When you enable AI Transcription before extracting, INDXR.AI downloads the video audio and runs it
        through AssemblyAI Universal-3 Pro before exporting as JSON.
      </p>

      <p><strong>What changes:</strong></p>

      <pre className="prose-content-pre"><code>{`{
  "video": {
    ...
    "is_auto_generated": false,
    "transcript_source": "assemblyai"
  },
  "segments": [
    {
      "text": "Hello everyone, welcome to this tutorial.",
      "start": 0.0,
      "end": 2.1,
      "duration": 2.1
    },
    {
      "text": "Today we're going to build a complete RAG pipeline.",
      "start": 2.1,
      "end": 5.4,
      "duration": 3.3
    }
  ]
}`}</code></pre>

      <p>
        The text now has proper capitalization, punctuation, and sentence boundaries. That single
        difference has downstream effects throughout any pipeline that processes this text:
      </p>

      <ul>
        <li>
          <strong>Sentence detection works correctly.</strong> If you split on sentence endings to build
          summaries or chunks, punctuated text gives you real sentence boundaries. Auto-captions give you
          arbitrary cuts.
        </li>
        <li>
          <strong>Readability for end users.</strong> If your application presents transcript text to
          users, punctuated text reads like text. Unpunctuated lowercase reads like a raw log file.
        </li>
        <li>
          <strong>Better RAG quality.</strong> Chunkers that respect sentence boundaries need punctuation
          to work. Without it, chunks get cut mid-thought.
        </li>
        <li>
          <strong>Works for videos without captions.</strong> Roughly 20% of YouTube videos have no
          auto-captions (
          <a
            href="https://support.google.com/youtube/answer/6373554"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Help
          </a>
          ). AI Transcription is the only way to get JSON output for those videos.
        </li>
      </ul>

      <p><strong>Cost: 1 credit per minute of video, minimum 1 credit.</strong></p>

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
            <td>10 minutes</td>
            <td>10 credits</td>
            <td>€0.14</td>
            <td>€0.12</td>
          </tr>
          <tr>
            <td>30 minutes</td>
            <td>30 credits</td>
            <td>€0.42</td>
            <td>€0.35</td>
          </tr>
          <tr>
            <td>1 hour</td>
            <td>60 credits</td>
            <td>€0.84</td>
            <td>€0.70</td>
          </tr>
          <tr>
            <td>3 hours</td>
            <td>180 credits</td>
            <td>€2.52</td>
            <td>€2.10</td>
          </tr>
        </tbody>
      </table>

      <p>
        For a 1-hour video: less than €1 at any tier. For context,{" "}
        <a href="https://www.rev.com/services/automatic-transcription" target="_blank" rel="noopener noreferrer">
          Rev.com
        </a>{" "}
        charges $0.25 per minute for AI transcription — that&apos;s $15 for a 1-hour video. AssemblyAI&apos;s
        standalone API is $0.0035/minute — INDXR.AI sits at a comparable per-minute cost while adding the
        export pipeline, library, and resegmentation on top.
      </p>

      <h2>Option 3: AI Transcription + RAG JSON — Best Quality</h2>

      <p>
        For developers building RAG pipelines, vector databases, or semantic search over YouTube content,
        the RAG JSON export is the right output. It takes the AI-transcribed text and applies chunking,
        sentence-boundary snapping, overlap, and per-chunk metadata.
      </p>

      <p>
        Instead of 2–5 second raw segments, you get 90–120 second chunks (~300–400 tokens each — the range
        that produces optimal embedding retrieval quality). Each chunk carries a direct link to that
        timestamp in the video:
      </p>

      <pre className="prose-content-pre"><code>{`{
  "chunks": [
    {
      "chunk_id": "dQw4w9WgXcQ_chunk_000",
      "chunk_index": 0,
      "text": "Hello everyone, welcome to this tutorial. Today we're going to build a complete RAG pipeline using YouTube transcripts as our data source...",
      "start_time": 0.0,
      "end_time": 118.4,
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=0",
      "token_count_estimate": 312,
      "metadata": {
        "video_id": "dQw4w9WgXcQ",
        "title": "How to Build a RAG Pipeline",
        "channel": "AI Engineering Weekly",
        "chunk_index": 0,
        "total_chunks": 31
      }
    }
  ]
}`}</code></pre>

      <p>
        This output loads directly into LangChain, LlamaIndex, Pinecone, ChromaDB, Weaviate, and Qdrant.
        The <code>metadata</code> object on each chunk is a flat key-value structure ready for direct
        vector database upsert.
      </p>

      <p>
        <strong>Cost: AI Transcription (1 credit per minute) + RAG export (1 credit per 15 minutes).</strong>
      </p>

      <p>
        A 1-hour video at Plus pricing (€0.012/credit): AI Transcription: 60 credits = €0.72. RAG export:
        4 credits = €0.05. <strong>Total: 64 credits = €0.77.</strong>
      </p>

      <p>
        The first 3 RAG exports are free regardless of video length — enough to validate the output in
        your actual pipeline before spending credits.
      </p>

      <h2>Compatibility with youtube-transcript-api</h2>

      <p>
        The{" "}
        <a href="https://pypi.org/project/youtube-transcript-api" target="_blank" rel="noopener noreferrer">
          <code>youtube-transcript-api</code>
        </a>{" "}
        Python library (6,900+ GitHub stars, the de facto standard) uses <code>text</code>,{" "}
        <code>start</code>, and <code>duration</code> as field names. INDXR.AI&apos;s standard JSON uses the
        same names, adds <code>end</code> (calculated as <code>start + duration</code>), and wraps
        everything in a <code>video</code> metadata object. Code that reads{" "}
        <code>segments[i][&quot;start&quot;]</code> and <code>segments[i][&quot;text&quot;]</code> works
        without modification.
      </p>

      <p>
        The important difference: <code>youtube-transcript-api</code> deployed to cloud environments (AWS,
        GCP, Railway) frequently hits YouTube&apos;s IP blocking. INDXR.AI runs through residential proxies
        specifically to avoid this, which is why it continues working in production environments where the
        open-source library fails.
      </p>

      <p>
        For the full RAG-optimized export with chunking and metadata, see{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link>. For audio
        file uploads, see <Link href="/audio-to-text">Audio Upload</Link>. For credit packages, see the{" "}
        <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
