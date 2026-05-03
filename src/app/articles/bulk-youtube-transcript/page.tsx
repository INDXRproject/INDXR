import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "Bulk YouTube Transcript Download — Entire Playlists in One Job | INDXR.AI",
  description:
    "Download transcripts from entire YouTube playlists in one extraction. First 3 auto-caption videos free. Real-time progress. Export as TXT, Markdown, SRT, JSON, or RAG-ready ZIP.",
}

const faqs = [
  {
    q: "Is there a limit on how many videos I can extract?",
    a: "No hard limit — extract as many as you have credits for. We recommend batches of up to 100 videos for reliable operation. Larger playlists can be broken into multiple extractions; all results go to the same library.",
  },
  {
    q: "What happens if some videos fail?",
    a: "Failures are shown in the completion screen with specific error types — bot detection, timeout, age-restricted, members-only. Videos that fail due to temporary issues (bot detection, timeouts) are automatically retried once. For persistent failures, you can extract individual videos separately.",
  },
  {
    q: "Can I extract from any public YouTube playlist?",
    a: "Yes, including other creators' public playlists and curated topic lists — not just your own content. Unlisted playlists (accessible by link) also work.",
  },
  {
    q: "Do I get charged for videos already in my library?",
    a: "No. The pre-extraction scan shows which videos are already in your library and excludes them from the job. You won't be charged for transcripts you already have.",
  },
  {
    q: "Can I mix auto-caption and AI Transcription in the same playlist?",
    a: "Yes. Toggle AI Transcription per video in the selection screen. Videos with auto-captions default to free caption extraction; you can upgrade individual videos to AI Transcription where higher accuracy matters.",
  },
]

export default function BulkYouTubeTranscriptPage() {
  return (
    <ToolPageTemplate
      title="Bulk YouTube Transcript Downloader — Extract Entire Playlists at Once"
      metaDescription="Download transcripts from entire YouTube playlists in one extraction. First 3 auto-caption videos free. Real-time progress. Export as TXT, Markdown, SRT, JSON, or RAG-ready ZIP."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
    >
      <p>
        Downloading transcripts from a YouTube playlist one video at a time is the kind of repetitive work
        that should be automated. INDXR.AI&apos;s bulk extraction processes an entire playlist — or a selected
        subset — as a single background job. You set it up, monitor the progress, and the results appear in
        your library as each video completes.
      </p>

      <p>
        We&apos;ve tested this at scale: 19 videos, 783 minutes of total audio, all processed by AI
        transcription, completed in 18 minutes and 53 seconds.
      </p>

      <h2>How Bulk Extraction Works</h2>

      <p>
        <strong>Paste a playlist URL.</strong> INDXR.AI scans every video in the playlist before you
        commit: caption availability, duration, and whether you&apos;ve already extracted it before. Videos
        already in your library are flagged so you don&apos;t pay for duplicates.
      </p>

      <p>
        <strong>Select and configure.</strong> Choose which videos to include. For videos without
        auto-captions, toggle AI Transcription individually — the credit cost updates in real time as you
        make selections. You see the exact total before confirming.
      </p>

      <p>
        <strong>Monitor progress.</strong> Extraction runs on INDXR.AI&apos;s servers. Per-video status
        updates show which video is processing, which have completed, and any failures with specific error
        types. Stay on the page while the job runs — the system handles disconnects as a fallback, but
        active monitoring lets you respond to issues immediately.
      </p>

      <p>
        <strong>Download results.</strong> After extraction, download individual transcripts or a bulk ZIP
        with all files in your chosen format. For AI pipelines, the ZIP can contain RAG-optimized JSON
        files ready to load into a vector database.
      </p>

      <h2>What&apos;s Free and What Costs Credits</h2>

      <p>
        The first three <strong>auto-caption</strong> videos in any playlist extraction are always free.
        Auto-caption extraction for additional videos costs 1 credit per video from video four onward. AI
        Transcription always costs 1 credit per minute regardless of position in the playlist.
      </p>

      <p><strong>Example: 30-video lecture series, all auto-captions</strong></p>
      <ul>
        <li>Videos 1–3: Free</li>
        <li>Videos 4–30: 27 credits (~€0.32 at Plus pricing)</li>
      </ul>

      <p><strong>Example: 10-video research playlist, 4 videos without captions (avg 20 min)</strong></p>
      <ul>
        <li>Videos 1–3: Free (assuming auto-captions)</li>
        <li>Videos 4–6 (auto-captions): 3 credits</li>
        <li>4 videos × AI Transcription × 20 min: 80 credits</li>
        <li>Total: 83 credits (~€1.00 at Plus pricing)</li>
      </ul>

      <p>Credits never expire. Buy when you need to, use when you&apos;re ready.</p>

      <h2>Export Formats for Bulk Downloads</h2>

      <p>Every format is available in bulk:</p>

      <p>
        <strong>ZIP of individual files</strong> — one file per video, consistent naming (
        <code>video-title_video-id.ext</code>). Works for TXT, Markdown, SRT, VTT, CSV, and JSON.
      </p>

      <p>
        <strong>Merged single file</strong> — available for CSV (one row per segment across all videos,
        with <code>video_id</code> and <code>video_title</code> columns) and RAG JSON (one JSON array
        across all videos). Useful for corpus analysis and building a knowledge base from an entire course
        or channel.
      </p>

      <h2>Common Bulk Extraction Use Cases</h2>

      <p>
        <strong>Course transcription:</strong> Extract all lectures from an educational playlist. Export
        each as Markdown with YAML frontmatter for an Obsidian or Notion knowledge base, or as a merged
        CSV for analysis.
      </p>

      <p>
        <strong>Research corpus:</strong> Download transcripts from a conference archive, a speaker&apos;s body
        of work, or a topic-specific playlist. The merged CSV or merged RAG JSON gives you a single,
        queryable dataset.
      </p>

      <p>
        <strong>Content repurposing:</strong> Extract your own video playlist and export as plain Markdown
        — ready to feed into an AI assistant for blog post generation, newsletter writing, or social
        content.
      </p>

      <p>
        <strong>AI knowledge base:</strong> Extract a playlist as RAG-optimized JSON and load into a
        vector database for semantic search. See{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link> for a
        complete implementation guide.
      </p>

      <h2>Playlist Size and Limits</h2>

      <p>
        INDXR.AI handles playlists reliably in batches of up to 100 videos. For larger playlists, extract
        in batches — all results accumulate in the same library automatically. YouTube playlists can
        contain up to 5,000 videos; batch extraction in groups of 50–100 is the practical approach for
        large archives.
      </p>

      <p>
        For the full playlist workflow including pre-extraction scanning and real-time progress tracking,
        see <Link href="/youtube-playlist-transcript">YouTube Playlist Transcript</Link>. For credit
        package details, see <Link href="/pricing">pricing</Link>.
      </p>
    </ToolPageTemplate>
  )
}
