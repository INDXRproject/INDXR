# How INDXR.AI Works — Extract, Transcribe, Export, Store

**Meta title:** How INDXR.AI Works — YouTube Transcripts, AI Transcription & Export | INDXR.AI
**Meta description:** INDXR.AI extracts YouTube captions instantly, transcribes audio when captions don't exist, exports in 8 formats, and stores everything in a searchable library. Here's exactly how each part works.
**Slug:** /how-it-works
**Schema:** HowTo + FAQPage
**Internal links:** /youtube-transcript-generator, /pricing, /youtube-transcript-for-rag, /youtube-transcript-markdown, /audio-to-text, /youtube-transcript-not-available
**Word count:** ~1600 words

---

INDXR.AI takes a YouTube URL — or an audio file you upload — and turns it into a clean, searchable, exportable transcript. The process is designed to be fast for simple cases (a captioned video is done in seconds) and reliable for harder ones (videos without captions, long playlists, audio files up to 500MB).

Here's exactly how each part of the system works.

---

## Step 1: Paste a URL or Upload a File

**For YouTube videos:** Paste a standard YouTube URL, a shortened `youtu.be/` link, or a full playlist URL into the Single Video or Playlist tab. INDXR.AI fetches the video metadata immediately — title, duration, channel, and whether auto-captions are available — before doing any extraction. You see what you're working with before committing.

**For audio or video files:** The Audio Upload tab accepts MP3, MP4, WAV, M4A, OGG, FLAC, and WEBM files up to 500MB. The file uploads directly to INDXR.AI's backend server — not through a web intermediary with file-size limits. A 2-hour podcast recording, a lecture, an interview — all handled.

**Access restrictions detected upfront:** If a video is age-restricted, members-only, or private, INDXR.AI shows you a specific error immediately — before any processing and before any credits are used. You know exactly what the obstacle is rather than getting a generic failure.

---

## Step 2: Choose Your Method

### Auto-Captions — Free

When YouTube has auto-generated captions for a video, INDXR.AI retrieves them via YouTube's internal API. Extraction takes a few seconds. The result is the same text you'd see if you clicked "Show transcript" on the YouTube page — but exported in a clean format, stored in your library, and available for re-export at any time.

Auto-captions are free for single videos, with no daily limit for registered users. For playlists, the first three videos are always free; additional captioned videos cost 1 credit each from video four onward.

The honest limitation: auto-generated captions lack punctuation and capitalization. They're a continuous stream of lowercase text. For reading, copy-pasting into AI tools, or quick data extraction, this is usually fine. For user-facing applications, subtitle timing, or RAG pipelines that rely on sentence detection, the quality gap matters.

### AI Transcription — 1 Credit Per Minute

When a video has no auto-captions — or when you need better quality than auto-captions provide — enable the AI Transcription toggle. INDXR.AI downloads the video audio through residential proxies (to avoid YouTube's IP-blocking of cloud servers) and sends it to AssemblyAI Universal-3 Pro.

AssemblyAI Universal-3 Pro produces transcripts with proper punctuation, accurate capitalization, and real sentence boundaries. Accuracy runs 94–96%+ on clean audio (AssemblyAI benchmarks, assemblyai.com). It supports 99+ languages with automatic detection.

Processing time: approximately 1 minute per 10 minutes of video. A 30-minute video takes around 3 minutes. You can navigate away — the job runs as a background task on INDXR.AI's servers and the result appears in your library when complete.

**Cost: 1 credit per minute of audio, minimum 1 credit.** The credit is charged after the audio duration is determined — you see the exact cost in the confirmation step before confirming.

---

## Step 3: Export in the Format You Need

After extraction, you choose your export format. All formats are available to registered users (free accounts included). Anonymous users can download TXT.

| Format | Best for |
|---|---|
| **TXT — Plain** | Reading, sharing, pasting into ChatGPT or Claude |
| **TXT — With Timestamps** | Referencing specific moments, research notes |
| **Markdown — Plain** | Blog posts, newsletters, AI input |
| **Markdown — With Timestamps** | Obsidian notes, Notion databases (includes YAML frontmatter) |
| **SRT** | Video editors (Premiere Pro, DaVinci Resolve, CapCut) |
| **VTT** | Websites, LMS platforms (Canvas, Moodle, Articulate) |
| **CSV** | Spreadsheet analysis, research data |
| **JSON** | Developer integration, data pipelines |
| **JSON — RAG Optimized** | Vector databases, LangChain, LlamaIndex, Pinecone |

**On SRT and VTT quality:** YouTube's raw caption timing creates segments every 2–4 seconds — too short for comfortable reading in a video player or editor. INDXR.AI resegments SRT and VTT output into 3–7 second blocks at a maximum of 42 characters per line, following broadcast subtitle standards (BBC Subtitle Guidelines; Netflix Timed Text Style Guide). This produces subtitle files that work in video editors without manual cleanup.

**On Markdown:** The Markdown export includes YAML frontmatter — title, source URL, channel, duration, language, type, and creation timestamp — formatted for Obsidian Dataview compatibility. Every field is queryable immediately after dropping the file into your vault.

**On RAG JSON:** The RAG-optimized export merges raw transcript segments into 90–120 second chunks (~300–400 tokens), applies sentence-boundary snapping, adds 15% overlap, and attaches a deep link and flat metadata object to every chunk. This is the format that loads directly into vector databases for semantic search. Cost: 1 credit per 15 minutes of video on top of extraction costs.

---

## Step 4: Library and Re-Export

Every transcript you extract is saved to your library. The library is searchable by title, channel, or content text. Transcripts never expire.

From the library you can:

- **Re-export in any format** — extracted something three months ago as TXT? Export it as JSON today without re-extracting.
- **Edit in the rich-text editor** — INDXR.AI uses Tiptap, a full-featured browser-based editor. Correct errors, add formatting, annotate. Edits are stored separately from the original, so you can always revert.
- **Generate an AI summary** — 3 credits produces a summary with key takeaways and action points, powered by DeepSeek V3. Available for any transcript in your library.
- **Organize into collections** — Group transcripts by project, course, channel, or any category that makes sense for your workflow.

---

## What Happens During Playlist Extraction

Playlist extraction runs as a background job — you initiate it, the server handles the rest. You can close the browser tab. When you return, a recovery banner shows the current status.

INDXR.AI scans caption availability for every video before extraction starts. The availability screen shows per-video status — which have captions, which need AI Transcription, which are already in your library. You make selections and see the total credit cost before confirming.

During extraction, you see real-time progress: which video is being processed, how many are complete, and any errors with specific explanations. Videos that fail due to temporary issues (bot detection, timeouts) are automatically retried once.

---

## Pricing at a Glance

| Action | Cost |
|---|---|
| Single video, auto-captions | Free |
| Single video, AI Transcription | 1 credit per minute |
| Playlist video 1–3 (auto-captions) | Free |
| Playlist video 4+ (auto-captions) | 1 credit per video |
| Playlist video, AI Transcription | 1 credit per minute |
| AI Summary | 3 credits |
| RAG JSON export | 1 credit per 15 minutes |
| Standard export (all other formats) | Free |

Credits are purchased once and never expire. 25 free credits on signup are enough to test AI Transcription on a 25-minute video, run 8 AI summaries, or export several RAG JSON files. See [pricing](/pricing) for package details.

---

## Frequently Asked Questions

**Does INDXR.AI work without an account?**
Yes, for single videos with auto-captions. Anonymous users can extract TXT transcripts up to 10 times per day. A free account removes the daily limit, unlocks all export formats, and gives you 25 welcome credits to test AI Transcription and other paid features.

**What happens if a video has no auto-captions?**
INDXR.AI detects this before extraction and prompts you to enable AI Transcription. There's no silent failure — you're told upfront whether captions exist and what AI Transcription will cost for that specific video's duration.

**How long does AI Transcription take?**
Approximately 1 minute per 10 minutes of video duration. A 1-hour video typically completes in 6–8 minutes. INDXR.AI runs this as a background job — you don't need to keep the page open.

**Can INDXR.AI transcribe very long videos?**
Yes. The pipeline has been tested on videos up to 214 minutes. There is no per-video duration cap. AssemblyAI handles arbitrarily long audio without truncation, unlike some tools that limit transcription at 25MB or 90 minutes.

**What if the extraction fails partway through a playlist?**
Completed videos are saved to your library as they finish. Only incomplete videos need to be re-extracted. The session recovery system shows you which videos completed and which didn't if you return after a disconnect.

---

*[Start extracting](/youtube-transcript-generator) — paste any YouTube URL. Auto-caption videos are free and instant.*
