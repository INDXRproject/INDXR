# YouTube Transcript JSON Export — Structured Data for Developers

**Meta title:** YouTube Transcript JSON Export — Free Auto-Captions to RAG-Ready Output | INDXR.AI
**Meta description:** Export YouTube transcripts as structured JSON with metadata wrapper, start/end timestamps, and video context. Free for auto-caption videos. AI transcription and RAG-optimized chunking available.
**Slug:** /youtube-transcript-json
**Schema:** SoftwareApplication + FAQPage
**Internal links:** /youtube-transcript-for-rag, /pricing, /how-it-works, /audio-to-text
**Word count:** ~1600 words

---

If you've ever worked with YouTube transcript data programmatically, you know the problem: you extract the text, you get an array of 2–5 second fragments with no video title, no channel, no language, no end timestamp, no context. You spend the next hour writing boilerplate to add metadata, calculate end times, merge short segments, and figure out which video these fragments even came from.

INDXR.AI exports YouTube transcripts as structured JSON with a metadata wrapper built in. Auto-caption extraction is free. For better quality — proper punctuation, higher accuracy, cleanly segmented text — AI transcription is available at a per-minute cost. For developers building RAG pipelines or vector databases, a RAG-optimized variant chunks the transcript into embedding-ready segments with deep links and flat metadata per chunk.

Here's exactly what each option gives you and what it costs.

---

## Option 1: Auto-Captions + Standard JSON — Free

For any YouTube video with auto-generated captions, JSON export is free. No account required for a single video; a free account removes the daily rate limit.

**What you get:**

```json
{
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
}
```

**The honest limitation:** Auto-generated captions lack punctuation and capitalization. The text arrives as a continuous stream of lowercase words. Notice `"hello everyone welcome to this tutorial"` — no capital, no period. For a quick data extraction or a pipeline that processes the text further, this may be fine. For anything that presents the text to users, generates citations, or relies on sentence detection for downstream processing (like RAG chunking), this is a meaningful quality gap.

`is_auto_generated: true` in the output flags this so your code can handle it differently from higher-quality sources.

**Cost: Free.** Standard JSON export is included at no credit cost for any transcript extraction.

---

## Option 2: AI Transcription + Standard JSON — 1 Credit Per Minute

When you enable AI Transcription before extracting, INDXR.AI downloads the video audio and runs it through AssemblyAI Universal-3 Pro before exporting as JSON.

**What changes:**

```json
{
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
}
```

The text now has proper capitalization, punctuation, and sentence boundaries. That single difference has downstream effects throughout any pipeline that processes this text:

- **Sentence detection works correctly.** If you split on sentence endings to build summaries or chunks, punctuated text gives you real sentence boundaries. Auto-captions give you arbitrary cuts.
- **Readability for end users.** If your application presents transcript text to users, punctuated text reads like text. Unpunctuated lowercase reads like a raw log file.
- **Better RAG quality.** Chunkers that respect sentence boundaries (like pySBD, which achieves 97.9% accuracy on the Golden Rule Set benchmark) need punctuation to work. Without it, chunks get cut mid-thought.
- **Works for videos without captions.** Roughly 20% of YouTube videos have no auto-captions (YouTube Help, support.google.com/youtube/answer/6373554). AI Transcription is the only way to get JSON output for those videos.

**Cost: 1 credit per minute of video, minimum 1 credit.**

A real example with actual pricing:

| Video length | Credits | Cost at Basic (€6.99/500cr) | Cost at Plus (€13.99/1,200cr) |
|---|---|---|---|
| 10 minutes | 10 credits | €0.14 | €0.12 |
| 30 minutes | 30 credits | €0.42 | €0.35 |
| 1 hour | 60 credits | €0.84 | €0.70 |
| 3 hours | 180 credits | €2.52 | €2.10 |

For a 1-hour video: less than €1 at any tier. For context, Rev.com charges $0.25 per minute for AI transcription — that's $15 for a 1-hour video (Rev.com pricing, rev.com). AssemblyAI's standalone API is $0.0035/minute — INDXR.AI sits at a comparable per-minute cost while adding the export pipeline, library, and resegmentation on top.

---

## Option 3: AI Transcription + RAG JSON — Best Quality, Per-Minute + Small Export Fee

For developers building RAG pipelines, vector databases, or semantic search over YouTube content, the RAG JSON export is the right output. It takes the AI-transcribed text and applies chunking, sentence-boundary snapping, overlap, and per-chunk metadata.

**What changes:**

Instead of 2–5 second raw segments, you get 90–120 second chunks (~300–400 tokens each — the range that produces optimal embedding retrieval quality according to NVIDIA's benchmark and the Vectara NAACL 2025 study). Each chunk carries a direct link to that timestamp in the video:

```json
{
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
}
```

This output loads directly into LangChain, LlamaIndex, Pinecone, ChromaDB, Weaviate, and Qdrant. The `metadata` object on each chunk is a flat key-value structure ready for direct vector database upsert.

**Why use auto-captions for RAG JSON?** You can, but the Vectara NAACL 2025 paper found that chunking strategy significantly affects retrieval quality — and sentence-boundary snapping, which is central to good chunking, requires punctuation. Auto-caption RAG JSON will work but produce lower retrieval quality than AI-transcribed RAG JSON. INDXR.AI shows a warning if you try to enable RAG JSON on an auto-caption transcript.

**Cost: AI Transcription (1 credit per minute) + RAG export (1 credit per 15 minutes).**

A 1-hour video at Plus pricing (€0.012/credit):
- AI Transcription: 60 credits = **€0.72**
- RAG export: 4 credits = **€0.05**
- **Total: 64 credits = €0.77**

Best-quality RAG-ready JSON for a 1-hour YouTube video costs less than €1. The first 3 RAG exports are free regardless of video length — enough to validate the output in your actual pipeline before spending credits.

---

## The Compatibility Question: Does This Match youtube-transcript-api?

The `youtube-transcript-api` Python library (6,900+ GitHub stars, the de facto standard) uses `text`, `start`, and `duration` as field names (PyPI, pypi.org/project/youtube-transcript-api). INDXR.AI's standard JSON uses the same names, adds `end` (calculated as `start + duration`), and wraps everything in a `video` metadata object. Code that reads `segments[i]["start"]` and `segments[i]["text"]` works without modification.

The important difference: `youtube-transcript-api` deployed to cloud environments (AWS, GCP, Railway) frequently hits YouTube's IP blocking. The library's README dedicates a full section to this problem — it's the most-reported issue. INDXR.AI runs through residential proxies specifically to avoid this, which is why it continues working in production environments where the open-source library fails.

---

## Frequently Asked Questions

**Is standard JSON export always free?**
Yes. Standard JSON export from auto-caption videos has no additional credit cost beyond the base extraction, which is free for captioned videos. You pay credits only for AI Transcription (1 credit/minute) and RAG JSON export (1 credit per 15 minutes). A free account with 25 welcome credits lets you test both.

**When does it make sense to pay for AI Transcription over free auto-captions?**
Three situations: (1) the video has no auto-captions at all, (2) you need proper punctuation for downstream text processing or user-facing display, or (3) you're building a RAG pipeline where sentence-boundary chunking quality matters. For quick data extraction where you're doing your own text processing anyway, free auto-captions are often fine.

**What's the total cost for a 1-hour video with maximum quality output?**
AI Transcription + RAG JSON export: 60 credits + 4 credits = 64 credits. At Plus pricing (€13.99/1,200 credits), that's €0.77. At Basic pricing (€6.99/500 credits), it's €0.89. Credits never expire.

**Does JSON export work for audio files I upload myself?**
Yes. Upload any audio or video file via the [Audio Upload tab](/audio-to-text) (MP3, MP4, WAV, M4A, OGG, FLAC, WEBM, up to 500MB). The same JSON export options apply — standard JSON and RAG JSON both available after transcription completes.

**Can I export as JSONL instead of JSON?**
Yes. JSONL (one JSON object per line) is available as an alternative to the standard JSON array. This format is what OpenAI's fine-tuning API and Hugging Face datasets expect for ML pipeline ingestion.

**What if I want to process multiple videos and get one combined JSON file?**
For playlists: extract the playlist, then use the bulk export with merge option to get all transcripts as a single JSON array. Each segment carries `video_id` and `title` in the metadata so you can distinguish sources in your downstream pipeline.

---

*[Extract a YouTube transcript as JSON free](/youtube-transcript-generator) — auto-caption videos export instantly at no cost. 25 free credits on signup to test AI transcription and RAG export.*
