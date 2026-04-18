import type { Metadata } from "next"
import Link from "next/link"
import { ArticleTemplate } from "@/components/content/templates/ArticleTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "How INDXR.AI Works — YouTube Transcripts, AI Transcription & Export | INDXR.AI",
  description:
    "INDXR.AI extracts YouTube captions instantly, transcribes audio when captions don't exist, exports in 8 formats, and stores everything in a searchable library. Here's exactly how each part works.",
}

const faqs = [
  {
    q: "Does INDXR.AI work without an account?",
    a: "Yes, for single videos with auto-captions. Anonymous users can extract TXT transcripts up to 10 times per day. A free account removes the daily limit, unlocks all export formats, and gives you 25 welcome credits to test AI Transcription and other paid features.",
  },
  {
    q: "What happens if a video has no auto-captions?",
    a: "INDXR.AI detects this before extraction and prompts you to enable AI Transcription. There's no silent failure — you're told upfront whether captions exist and what AI Transcription will cost for that specific video's duration.",
  },
  {
    q: "How long does AI Transcription take?",
    a: "Approximately 1 minute per 10 minutes of video duration. A 1-hour video typically completes in 6–8 minutes. INDXR.AI runs this as a background job — you don't need to keep the page open.",
  },
  {
    q: "Can INDXR.AI transcribe very long videos?",
    a: "Yes. The pipeline has been tested on videos up to 214 minutes. There is no per-video duration cap. AssemblyAI handles arbitrarily long audio without truncation, unlike some tools that limit transcription at 25MB or 90 minutes.",
  },
  {
    q: "What if the extraction fails partway through a playlist?",
    a: "Completed videos are saved to your library as they finish. Only incomplete videos need to be re-extracted. The session recovery system shows you which videos completed and which didn't if you return after a disconnect.",
  },
]

const sources = [
  {
    label: "AssemblyAI — Universal-3 Pro",
    url: "https://www.assemblyai.com/models",
  },
]

export default function HowItWorksPage() {
  return (
    <ArticleTemplate
      title="How INDXR.AI Works — Extract, Transcribe, Export, Store"
      metaDescription="INDXR.AI extracts YouTube captions instantly, transcribes audio when captions don't exist, exports in 8 formats, and stores everything in a searchable library. Here's exactly how each part works."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        INDXR.AI takes a YouTube URL — or an audio file you upload — and turns it into a clean, searchable,
        exportable transcript. The process is designed to be fast for simple cases (a captioned video is
        done in seconds) and reliable for harder ones (videos without captions, long playlists, audio files
        up to 500MB).
      </p>

      <h2>Step 1: Paste a URL or Upload a File</h2>

      <p>
        <strong>For YouTube videos:</strong> Paste a standard YouTube URL, a shortened <code>youtu.be/</code>{" "}
        link, or a full playlist URL into the Single Video or Playlist tab. INDXR.AI fetches the video
        metadata immediately — title, duration, channel, and whether auto-captions are available — before
        doing any extraction. You see what you&apos;re working with before committing.
      </p>

      <p>
        <strong>For audio or video files:</strong> The{" "}
        <Link href="/audio-to-text">Audio Upload tab</Link> accepts MP3, MP4, WAV, M4A, OGG, FLAC, and
        WEBM files up to 500MB. The file uploads directly to INDXR.AI&apos;s backend server — not through a web
        intermediary with file-size limits. A 2-hour podcast recording, a lecture, an interview — all
        handled.
      </p>

      <p>
        <strong>Access restrictions detected upfront:</strong> If a video is age-restricted, members-only,
        or private, INDXR.AI shows you a specific error immediately — before any processing and before any
        credits are used.
      </p>

      <h2>Step 2: Choose Your Method</h2>

      <h3>Auto-Captions — Free</h3>

      <p>
        When YouTube has auto-generated captions for a video, INDXR.AI retrieves them via YouTube&apos;s
        internal API. Extraction takes a few seconds. The result is the same text you&apos;d see if you clicked
        &quot;Show transcript&quot; on the YouTube page — but exported in a clean format, stored in your library, and
        available for re-export at any time.
      </p>

      <p>
        Auto-captions are free for single videos, with no daily limit for registered users. For playlists,
        the first three videos are always free; additional captioned videos cost 1 credit each from video
        four onward.
      </p>

      <p>
        The honest limitation: auto-generated captions lack punctuation and capitalization. They&apos;re a
        continuous stream of lowercase text. For reading, copy-pasting into AI tools, or quick data
        extraction, this is usually fine. For user-facing applications, subtitle timing, or RAG pipelines
        that rely on sentence detection, the quality gap matters.
      </p>

      <h3>AI Transcription — 1 Credit Per Minute</h3>

      <p>
        When a video has no auto-captions — or when you need better quality than auto-captions provide —
        enable the AI Transcription toggle. INDXR.AI downloads the video audio through residential proxies
        (to avoid YouTube&apos;s IP-blocking of cloud servers) and sends it to AssemblyAI Universal-3 Pro.
      </p>

      <p>
        AssemblyAI Universal-3 Pro produces transcripts with proper punctuation, accurate capitalization,
        and real sentence boundaries. Accuracy runs 94–96%+ on clean audio. It supports 99+ languages with
        automatic detection.
      </p>

      <p>
        Processing time: approximately 1 minute per 10 minutes of video. A 30-minute video takes around 3
        minutes. You can navigate away — the job runs as a background task on INDXR.AI&apos;s servers and the
        result appears in your library when complete.
      </p>

      <p>
        <strong>Cost: 1 credit per minute of audio, minimum 1 credit.</strong> The credit is charged after
        the audio duration is determined — you see the exact cost in the confirmation step before
        confirming.
      </p>

      <h2>Step 3: Export in the Format You Need</h2>

      <p>
        After extraction, you choose your export format. All formats are available to registered users
        (free accounts included). Anonymous users can download TXT.
      </p>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>TXT — Plain</strong></td><td>Reading, sharing, pasting into ChatGPT or Claude</td></tr>
          <tr><td><strong>TXT — With Timestamps</strong></td><td>Referencing specific moments, research notes</td></tr>
          <tr><td><strong>Markdown — Plain</strong></td><td>Blog posts, newsletters, AI input</td></tr>
          <tr><td><strong>Markdown — With Timestamps</strong></td><td>Obsidian notes, Notion databases (includes YAML frontmatter)</td></tr>
          <tr><td><strong>SRT</strong></td><td>Video editors (Premiere Pro, DaVinci Resolve, CapCut)</td></tr>
          <tr><td><strong>VTT</strong></td><td>Websites, LMS platforms (Canvas, Moodle, Articulate)</td></tr>
          <tr><td><strong>CSV</strong></td><td>Spreadsheet analysis, research data</td></tr>
          <tr><td><strong>JSON</strong></td><td>Developer integration, data pipelines</td></tr>
          <tr><td><strong>JSON — RAG Optimized</strong></td><td>Vector databases, LangChain, LlamaIndex, Pinecone</td></tr>
        </tbody>
      </table>

      <p>
        <strong>On SRT and VTT quality:</strong> YouTube&apos;s raw caption timing creates segments every 2–4
        seconds — too short for comfortable reading in a video player or editor. INDXR.AI resegments SRT
        and VTT output into 3–7 second blocks at a maximum of 42 characters per line, following broadcast
        subtitle standards (<a href="https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/" target="_blank" rel="noopener noreferrer">BBC Subtitle Guidelines</a>; <a href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617" target="_blank" rel="noopener noreferrer">Netflix Timed Text Style Guide</a>).
      </p>

      <p>
        <strong>On Markdown:</strong> The{" "}
        <Link href="/youtube-transcript-markdown">Markdown export</Link> includes YAML frontmatter — title,
        source URL, channel, duration, language, type, and creation timestamp — formatted for Obsidian
        Dataview compatibility.
      </p>

      <p>
        <strong>On RAG JSON:</strong> The{" "}
        <Link href="/youtube-transcript-for-rag">RAG-optimized export</Link> merges raw transcript segments
        into 90–120 second chunks (~300–400 tokens), applies sentence-boundary snapping, adds 15% overlap,
        and attaches a deep link and flat metadata object to every chunk. Cost: 1 credit per 15 minutes of
        video on top of extraction costs.
      </p>

      <h2>Step 4: Library and Re-Export</h2>

      <p>
        Every transcript you extract is saved to your library. The library is searchable by title, channel,
        or content text. Transcripts never expire.
      </p>

      <p>From the library you can:</p>

      <ul>
        <li>
          <strong>Re-export in any format</strong> — extracted something three months ago as TXT? Export
          it as JSON today without re-extracting.
        </li>
        <li>
          <strong>Edit in the rich-text editor</strong> — Correct errors, add formatting, annotate. Edits
          are stored separately from the original, so you can always revert.
        </li>
        <li>
          <strong>Generate an AI summary</strong> — 3 credits produces a summary with key takeaways and
          action points, powered by DeepSeek V3.
        </li>
        <li>
          <strong>Organize into collections</strong> — Group transcripts by project, course, channel, or
          any category.
        </li>
      </ul>

      <h2>What Happens During Playlist Extraction</h2>

      <p>
        Playlist extraction runs as a background job — you initiate it, the server handles the rest.
        INDXR.AI scans caption availability for every video before extraction starts. The availability
        screen shows per-video status — which have captions, which need AI Transcription, which are already
        in your library. You make selections and see the total credit cost before confirming.
      </p>

      <p>
        During extraction, you see real-time progress: which video is being processed, how many are
        complete, and any errors with specific explanations. Videos that fail due to temporary issues (bot
        detection, timeouts) are automatically retried once.
      </p>

      <h2>Pricing at a Glance</h2>

      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Single video, auto-captions</td><td>Free</td></tr>
          <tr><td>Single video, AI Transcription</td><td>1 credit per minute</td></tr>
          <tr><td>Playlist video 1–3 (auto-captions)</td><td>Free</td></tr>
          <tr><td>Playlist video 4+ (auto-captions)</td><td>1 credit per video</td></tr>
          <tr><td>Playlist video, AI Transcription</td><td>1 credit per minute</td></tr>
          <tr><td>AI Summary</td><td>3 credits</td></tr>
          <tr><td>RAG JSON export</td><td>1 credit per 15 minutes</td></tr>
          <tr><td>Standard export (all other formats)</td><td>Free</td></tr>
        </tbody>
      </table>

      <p>
        Credits are purchased once and never expire. 25 free credits on signup are enough to test AI
        Transcription on a 25-minute video, run 8 AI summaries, or export several RAG JSON files. See the{" "}
        <Link href="/pricing">pricing page</Link> for package details, or{" "}
        <Link href="/youtube-transcript-generator">start extracting</Link> — auto-caption videos are free
        and instant.
      </p>

      <p>
        For videos where no captions are available, see{" "}
        <Link href="/youtube-transcript-not-available">YouTube Transcript Not Available</Link> for a full
        troubleshooting guide.
      </p>
    </ArticleTemplate>
  )
}
