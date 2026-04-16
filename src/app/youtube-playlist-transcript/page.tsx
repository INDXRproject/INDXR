import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Playlist Transcript Extractor — Batch Download in Minutes | INDXR.AI",
  description:
    "Extract transcripts from entire YouTube playlists in one job. First 3 auto-caption videos free. AI transcription available per video. Real-time progress, duplicate detection, all formats.",
}

const faqs = [
  {
    q: "Are the first three videos always free regardless of method?",
    a: "No — and this is important to understand. The first three videos are free only for auto-caption extraction. If any of those videos requires AI Transcription (because they have no captions, or because you've specifically toggled AI Transcription for them), that transcription costs 1 credit per minute at the standard rate. The 'free' applies to the per-video caption processing fee, not to AI transcription costs.",
  },
  {
    q: "What happens if I close the browser mid-extraction?",
    a: "The extraction job continues on INDXR.AI's servers. When you return to the playlist page, a recovery banner shows you the current job status and lets you resume monitoring. Videos that completed before the disconnect are already in your library. That said, staying on the page while the job runs is the recommended approach — you can respond to errors faster and monitor progress directly.",
  },
  {
    q: "Can I extract transcripts for an entire YouTube channel?",
    a: "INDXR.AI doesn't accept channel URLs directly. The workaround: create a playlist from the channel's videos in YouTube Studio or use YouTube's playlist feature, then extract that playlist URL. This covers any subset of a channel's content in batches of up to 100 videos.",
  },
  {
    q: "What if some videos in the playlist are already in my library?",
    a: "They're detected before extraction starts and excluded from the job by default. You won't be charged for videos you already have. The pre-extraction screen shows exactly which videos are new and which already exist, with links to the existing transcripts.",
  },
  {
    q: "Does playlist extraction work for unlisted playlists?",
    a: "Yes, if the playlist URL is accessible with the link. Unlisted playlists (visible to anyone with the URL) work the same as public ones. Private playlists that require YouTube login cannot be accessed.",
  },
  {
    q: "Can I mix auto-captions and AI Transcription in the same playlist extraction?",
    a: "Yes. The pre-extraction screen lets you toggle AI Transcription per video. Videos with auto-captions default to caption extraction; you can upgrade individual videos to AI Transcription where higher quality matters — for example, enabling AI Transcription for the key lectures in a course and using free captions for introductory videos you just need to skim.",
  },
]

export default function YouTubePlaylistTranscriptPage() {
  return (
    <ToolPageTemplate
      title="YouTube Playlist Transcript — Extract All Videos at Once"
      metaDescription="Extract transcripts from entire YouTube playlists in one job. First 3 auto-caption videos free. AI transcription available per video. Real-time progress, duplicate detection, all formats."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
    >
      <p>
        Extracting transcripts from a YouTube playlist one video at a time is slow, repetitive work. A
        20-video course, a research channel, a conference archive — each video requires its own URL, its
        own wait, its own download. INDXR.AI&apos;s playlist extraction processes the entire list as a single
        job, handled on the server while you monitor progress from the same page.
      </p>

      <p>
        We&apos;ve tested playlists containing 19 videos across 13 hours of total audio — all 19 extracted
        successfully in 18 minutes and 53 seconds.
      </p>

      <h2>How Playlist Extraction Works</h2>

      <p>
        Paste a YouTube playlist URL. Before any extraction begins, INDXR.AI fetches complete metadata for
        every video in the list: titles, durations, caption availability, and whether you&apos;ve already
        extracted any of them before. You see the full picture before committing to anything.
      </p>

      <p>
        The pre-extraction screen shows each video with two indicators: whether auto-captions are
        available, and whether a transcript already exists in your library. Videos already in your library
        are flagged with colored badges — amber for existing auto-caption transcripts, violet for existing
        AI transcriptions — and excluded from the extraction count by default. No duplicate charges.
      </p>

      <p>
        You select which videos to extract. For videos without captions, you toggle AI Transcription
        individually — INDXR.AI shows the credit cost per video, and the total updates as you make
        selections.
      </p>

      <p>
        Once you confirm, the job runs on INDXR.AI&apos;s servers. Progress updates in real time: which video
        is being processed, how many are complete, and any errors with specific explanations.{" "}
        <strong>Stay on the page while the job runs</strong> — the system is designed to handle crashes and
        disconnects as a fallback, but active monitoring gives you the best experience.
      </p>

      <h2>Pricing: What&apos;s Actually Free and What Costs Credits</h2>

      <p>
        The first three videos with <strong>auto-captions</strong> in any playlist extraction are free.
        From video four onwards, auto-caption extraction costs 1 credit per video. AI Transcription always
        costs 1 credit per minute regardless of position in the playlist.
      </p>

      <p><strong>Example 1: 20-video course, all auto-captions available</strong></p>
      <ul>
        <li>Videos 1–3 (auto-captions): Free</li>
        <li>Videos 4–20 (auto-captions): 17 credits</li>
        <li>Total: <strong>17 credits</strong> (~€0.20 at Plus pricing)</li>
      </ul>

      <p><strong>Example 2: 20-video course, 5 videos without captions averaging 15 minutes each</strong></p>
      <ul>
        <li>Videos 1–3 (auto-captions): Free</li>
        <li>Videos 4–15 (auto-captions): 12 credits</li>
        <li>5 videos × AI Transcription × 15 min: 75 credits</li>
        <li>Total: <strong>87 credits</strong> (~€1.04 at Plus pricing)</li>
      </ul>

      <p><strong>Example 3: 19-video Harvard lecture series, all AI Transcription, 783 total minutes</strong></p>
      <ul>
        <li>All 19 videos via AI Transcription: 783 credits</li>
        <li>Total: <strong>783 credits</strong> (~€9.40 at Plus pricing) — 13 hours of professional-grade transcription</li>
      </ul>

      <p>
        That last example is real data from a test extraction of the Justice with Michael Sandel course by
        Harvard University.
      </p>

      <h2>Error Handling and Retries</h2>

      <p>
        Videos that fail due to bot detection or timeout are retried once after a 30-second pause. The
        retry succeeds for most temporary issues. If a video fails after both attempts, it&apos;s marked with a
        specific error type in the completion screen — not a generic failure message. The completion screen
        groups failures by type: bot detection, timeout, age-restricted, members-only, and so on.
      </p>

      <h2>Export Options After Extraction</h2>

      <p>
        Each extracted video becomes an individual transcript in your library. Export options are the same
        as any other transcript: TXT, Markdown with YAML frontmatter, SRT, VTT, CSV, JSON, or
        RAG-optimized JSON.
      </p>

      <p>
        For bulk export of the entire playlist: select all relevant transcripts in your library, choose a
        format, and download a ZIP file with one file per video. Consistent naming:{" "}
        <code>video-title_video-id.ext</code>.
      </p>

      <p>
        For AI pipelines, RAG JSON export is available per video or in bulk, with a merge option that
        combines all playlist transcripts into a single JSON array. See{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link> for the
        schema and integration examples.
      </p>

      <h2>Playlist Size and Practical Limits</h2>

      <p>
        INDXR.AI processes playlists reliably in batches of up to 100 videos. For larger playlists, extract
        in batches — all results accumulate in the same library. Processing time scales with content: a
        playlist of 20 short videos finishes faster than 20 hour-long lectures. The real-time progress
        tracker shows you exactly where the job stands at all times.
      </p>

      <p>
        To start a playlist extraction, paste any YouTube playlist URL in the{" "}
        <Link href="/bulk-youtube-transcript">Bulk YouTube Transcript</Link> tool or use the Playlist tab
        on the <Link href="/youtube-transcript-generator">transcript generator</Link>.
      </p>
    </ToolPageTemplate>
  )
}
