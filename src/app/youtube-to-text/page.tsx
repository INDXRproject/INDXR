import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "Convert YouTube to Text — Free Transcript Extractor | INDXR.AI",
  description:
    "Convert any YouTube video to text in seconds. Free for videos with auto-captions. AI transcription for videos without. Download as TXT, Markdown, SRT, JSON, and more.",
}

const faqs = [
  {
    q: "Is this actually free?",
    a: "For auto-caption videos: yes, completely. No account needed to extract and download as TXT. Creating a free account unlocks all export formats and gives you 25 credits for testing AI transcription.",
  },
  {
    q: "How is this different from just copying YouTube's transcript?",
    a: "YouTube's 'Show transcript' button only works when captions exist, only displays text on-screen, and can only be copied manually. INDXR.AI works when captions don't exist (AI transcription), exports in eight formats, resegments subtitle timing for professional use, and saves everything to a searchable library for re-export later.",
  },
  {
    q: "Does it work for non-English videos?",
    a: "Auto-caption extraction works for any language YouTube supports (67 languages). AI Transcription supports 99+ languages with automatic detection — no need to specify the language.",
  },
  {
    q: "Can I convert a whole playlist to text at once?",
    a: "Yes. The Playlist tab accepts any YouTube playlist URL and processes all selected videos in a single job. First three auto-caption videos are free; additional auto-caption videos cost 1 credit each from video four onward.",
  },
  {
    q: "What about YouTube Shorts?",
    a: "Yes. Paste the Short's URL the same way as any other video. Shorts follow YouTube's standard caption system — auto-captions available for most, AI transcription available when they're not.",
  },
  {
    q: "How accurate is AI transcription?",
    a: "AssemblyAI Universal-3 Pro, which powers INDXR.AI's AI transcription, achieves 94–96%+ accuracy on clean audio. For challenging audio conditions — background noise, accents, overlapping speakers — accuracy varies but consistently outperforms YouTube's auto-captioning system.",
  },
]

export default function YouTubeToTextPage() {
  return (
    <ToolPageTemplate
      title="Convert YouTube Videos to Text — Free, Instant, No Extension"
      metaDescription="Convert any YouTube video to text in seconds. Free for videos with auto-captions. AI transcription for videos without. Download as TXT, Markdown, SRT, JSON, and more."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
    >
      <p>
        Converting a YouTube video to text takes two steps: paste the URL, download the result. For videos
        with auto-generated captions — the majority of YouTube content — this is free and happens in
        seconds. For videos without captions, AI transcription fills the gap.
      </p>

      <p>
        The output isn&apos;t a wall of raw text dumped into your clipboard. INDXR.AI produces a clean,
        formatted transcript that you can export in the format your workflow actually uses.
      </p>

      <h2>What &quot;Converting to Text&quot; Actually Means</h2>

      <p>When people search for &quot;YouTube to text,&quot; they usually want one of a few things:</p>

      <p>
        <strong>Copy-paste text for an AI assistant.</strong> Paste the transcript into ChatGPT, Claude,
        or NotebookLM. INDXR.AI&apos;s plain TXT export strips timestamps and formatting, giving you clean
        continuous prose ready for any AI tool.
      </p>

      <p>
        <strong>A readable document to reference later.</strong> Markdown export with YAML frontmatter
        works directly in Obsidian and Notion. A lecture becomes a structured note with the video&apos;s
        metadata attached.
      </p>

      <p>
        <strong>Subtitles for a video project.</strong> SRT and VTT export with resegmented timing — 3–7
        seconds per block at 42 characters per line, not YouTube&apos;s choppy 2–4 second fragments.
      </p>

      <p>
        <strong>Structured data for a developer pipeline.</strong> JSON export with a metadata wrapper and{" "}
        <code>start</code>/<code>end</code> timestamps per segment. Or RAG-optimized JSON for vector
        database ingestion.
      </p>

      <p>The conversion from video to text is the same operation. The output format determines what you can do with it.</p>

      <h2>When Auto-Captions Exist</h2>

      <p>
        For the roughly 80% of YouTube videos with auto-generated captions, conversion is immediate and
        free. INDXR.AI retrieves the caption data from YouTube and delivers it in whatever format you
        select.
      </p>

      <p>
        Auto-captions have one meaningful limitation: they lack punctuation and capitalization. The text
        arrives as a continuous stream of lowercase words. For reading, AI input, or quick research, this
        is usually fine. For anything that will be presented to users — a subtitle file, a published blog
        post, an Obsidian note you&apos;ll share — the quality difference between auto-captions and AI
        transcription is noticeable.
      </p>

      <h2>When Auto-Captions Don&apos;t Exist</h2>

      <p>
        About 20% of YouTube videos have no auto-generated captions (
        <a
          href="https://support.google.com/youtube/answer/6373554"
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube Help
        </a>
        ). Common reasons: the creator disabled captions, the video is in a language YouTube doesn&apos;t
        process well, the audio quality was too poor for YouTube&apos;s speech recognition, or the video was
        uploaded before YouTube&apos;s auto-caption rollout.
      </p>

      <p>
        For these videos, INDXR.AI uses AI transcription — downloading the audio and processing it through
        AssemblyAI Universal-3 Pro. The result is a properly punctuated, accurate transcript in 99+
        languages. Cost: 1 credit per minute of video.
      </p>

      <p>
        You&apos;ll know before spending any credits. INDXR.AI shows you whether captions are available and the
        AI transcription cost for that specific video&apos;s duration before you confirm. See{" "}
        <Link href="/youtube-transcript-not-available">why YouTube transcripts are sometimes unavailable</Link>{" "}
        for a full guide.
      </p>

      <h2>Export Options After Conversion</h2>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>TXT Plain</td><td>AI tools, copy-paste, quick reading</td></tr>
          <tr><td>TXT With Timestamps</td><td>Research, noting when things were said</td></tr>
          <tr><td>Markdown Plain</td><td>Blog posts, newsletters</td></tr>
          <tr><td>Markdown With Timestamps</td><td>Obsidian, Notion</td></tr>
          <tr><td>SRT</td><td>Video editors</td></tr>
          <tr><td>VTT</td><td>Web players, LMS platforms</td></tr>
          <tr><td>CSV</td><td>Spreadsheet analysis</td></tr>
          <tr><td>JSON</td><td>Developer integration</td></tr>
          <tr><td>JSON RAG</td><td>AI pipelines, vector databases</td></tr>
        </tbody>
      </table>

      <p>
        All formats export from the same transcript. Extract once, re-export in any format from your
        library at any time. To convert a video now,{" "}
        <Link href="/youtube-transcript-generator">paste any YouTube URL in the generator</Link>. For
        converting audio files from any source, the <Link href="/audio-to-text">Audio Upload tab</Link>{" "}
        accepts MP3, MP4, WAV, M4A, OGG, FLAC, and WEBM up to 500MB.
      </p>
    </ToolPageTemplate>
  )
}
