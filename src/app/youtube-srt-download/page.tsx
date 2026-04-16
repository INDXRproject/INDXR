import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube SRT Download — Resegmented for Video Editors | INDXR.AI",
  description:
    "Download YouTube subtitles as SRT or VTT with professional timing — 3–7 second segments, 42 characters per line. Free for videos with captions. AI transcription for videos without.",
}

const faqs = [
  {
    q: "Why don't raw YouTube SRT files work well in video editors?",
    a: "YouTube creates subtitle entries every 2–4 seconds for display synchronization during playback. Editors need longer segments — 3–7 seconds — for readable on-screen text. The difference is between a subtitle file designed for watching and one designed for editing. INDXR.AI resegments to the editing standard.",
  },
  {
    q: "What's the maximum characters per line in INDXR.AI's SRT output?",
    a: "42 characters per line, maximum two lines per block — the broadcast industry standard recommended by the BBC Subtitle Guidelines and Netflix Timed Text Style Guide. Lines that would exceed 42 characters are wrapped to a second line rather than truncated.",
  },
  {
    q: "Can I get both SRT and VTT from the same extraction?",
    a: "Yes. After extracting a transcript, you can export in any format from the export menu — SRT, VTT, and all other formats are available without re-extracting.",
  },
  {
    q: "Does the SRT output work for videos in non-Latin scripts?",
    a: "Yes. UTF-8 BOM encoding handles Arabic, Chinese, Japanese, Korean, Hebrew, and other scripts correctly in both SRT and VTT. The encoding is set automatically — no manual configuration required.",
  },
  {
    q: "What if the video has no auto-captions?",
    a: "INDXR.AI detects this before extraction and offers AI Transcription as a fallback. Enable it, confirm the credit cost for that video's length, and the audio is transcribed. The resulting SRT and VTT follow the same resegmentation as caption-based exports.",
  },
]

const sources = [
  {
    label: "YouTube Help — Auto-captions languages and processing",
    url: "https://support.google.com/youtube/answer/6373554",
  },
]

export default function YouTubeSrtDownloadPage() {
  return (
    <ToolPageTemplate
      title="Download YouTube Subtitles as SRT or VTT — Professional Timing, Free"
      metaDescription="Download YouTube subtitles as SRT or VTT with professional timing — 3–7 second segments, 42 characters per line. Free for videos with captions. AI transcription for videos without."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Downloading YouTube subtitles sounds simple. But open the SRT file from any basic subtitle
        downloader in Premiere Pro or DaVinci Resolve and you immediately see the problem: hundreds
        of two-second blocks, text flickering on and off before anyone can read it. YouTube&apos;s
        auto-caption system creates subtitle entries every 2–4 seconds, optimized for caption
        display during live playback — not for editors importing subtitle tracks.
      </p>

      <p>
        INDXR.AI resegments the output before you download. The result follows broadcast subtitle
        standards: 3–7 seconds per block, maximum 42 characters per line, no mid-sentence cuts.
        Import it into your editor and it&apos;s clean enough to use without manual cleanup.
      </p>

      <h2>The Problem with Raw YouTube Subtitle Files</h2>

      <p>
        YouTube generates captions at the granularity of its speech recognition — short bursts of
        2–4 seconds, usually 5–15 words each. This produces SRT files like:
      </p>

      <pre className="prose-content-pre"><code>{`1
00:00:02,000 --> 00:00:04,200
so one of the most important things

2
00:00:04,200 --> 00:00:06,100
to understand about this topic

3
00:00:06,100 --> 00:00:08,400
is that it changes depending on`}</code></pre>

      <p>
        Three subtitle blocks for one sentence. In a video player, the rapid switching is visually
        jarring. In a video editor, it creates a cluttered timeline and requires manual merging
        before the file is usable.
      </p>

      <p>
        Professional subtitle standards (BBC Subtitle Guidelines, Netflix Timed Text Style Guide,
        EBU Tech 3264) call for blocks of 3–7 seconds, a maximum of two lines, and 42 characters
        per line. These standards exist because human readers need time to read and comprehend text
        before it disappears.
      </p>

      <h2>What INDXR.AI Exports</h2>

      <p>After resegmentation, the same transcript looks like:</p>

      <pre className="prose-content-pre"><code>{`1
00:00:02,000 --> 00:00:08,400
So one of the most important things
to understand about this topic`}</code></pre>

      <p>
        One block. Complete sentence. Readable. Ready to import.
      </p>

      <p>
        The resegmentation algorithm respects sentence boundaries — it doesn&apos;t merge segments across
        full stops or question marks. A sentence that ends at 5.2 seconds won&apos;t be forced into the
        previous block just to hit a duration target.
      </p>

      <p>
        <strong>VTT output</strong> follows the same resegmentation and adds a header comment with
        the video title and language — useful for LMS platforms (Canvas, Moodle, Articulate 360)
        that use the header to associate subtitle files with source content.
      </p>

      <p>
        <strong>UTF-8 BOM encoding</strong> is included by default for both SRT and VTT. This
        matters for editors and systems that may misinterpret UTF-8 text without the BOM —
        particularly for non-Latin script content.
      </p>

      <h2>When Auto-Captions Don&apos;t Exist</h2>

      <p>
        About 20% of YouTube videos have no auto-generated captions — non-English content YouTube
        hasn&apos;t processed, videos from smaller creators, older uploads, content with poor audio
        quality (
        <a
          href="https://support.google.com/youtube/answer/6373554"
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube Help
        </a>
        ). Basic subtitle downloaders return empty files or errors for these videos.
      </p>

      <p>
        INDXR.AI detects this upfront and offers AI Transcription as a fallback. Enable the toggle,
        confirm the credit cost (1 credit per minute), and the audio is transcribed by AssemblyAI
        Universal-3 Pro. The resulting SRT/VTT is higher quality than auto-caption output — proper
        punctuation, accurate word boundaries, and clean segment timing.
      </p>

      <p>
        For audio files you&apos;ve already downloaded, the{" "}
        <Link href="/audio-to-text">Audio Upload tab</Link> accepts MP3, MP4, WAV, M4A, OGG, FLAC,
        and WEBM files up to 500MB and produces the same resegmented SRT/VTT output.
      </p>

      <h2>Compatibility with Video Editors</h2>

      <p>All major non-linear editors import SRT directly:</p>

      <ul>
        <li>
          <strong>DaVinci Resolve:</strong> File → Import → Subtitles. Supports SRT for timeline
          caption tracks.
        </li>
        <li>
          <strong>Premiere Pro:</strong> Captions workspace → Import captions from file. SRT imports
          as a caption track.
        </li>
        <li>
          <strong>Final Cut Pro:</strong> Import → Captions. Supports SRT with CEA-608
          compatibility.
        </li>
        <li>
          <strong>CapCut:</strong> Captions → Import. SRT and VTT both accepted.
        </li>
        <li>
          <strong>Kdenlive:</strong> Project → Add Clip → subtitle file.
        </li>
      </ul>

      <p>
        VTT is the correct format for HTML5 <code>&lt;video&gt;</code> elements and web-based
        players that don&apos;t accept SRT natively.
      </p>

      <p>
        <strong>LMS platforms that require VTT:</strong> Canvas, Moodle, Articulate 360, and most
        SCORM-compliant platforms accept VTT for accessibility compliance. INDXR.AI exports both
        formats from the same extraction.
      </p>

      <h2>Pricing</h2>

      <p>
        SRT and VTT export from auto-caption YouTube videos is free — no account required for a
        single extraction, no credit cost for the export itself. For videos without auto-captions,
        AI Transcription costs 1 credit per minute (a 30-minute video: 30 credits, approximately
        €0.36 at Plus pricing).
      </p>

      <p>
        There is no additional charge for the SRT or VTT export format itself — all export formats
        are included at no credit cost once you have a transcript. See the{" "}
        <Link href="/pricing">pricing page</Link> for credit packages.
      </p>

      <p>
        For videos where no captions are available at all, see{" "}
        <Link href="/youtube-transcript-not-available">YouTube Transcript Not Available</Link> for a
        complete troubleshooting guide.
      </p>
    </ToolPageTemplate>
  )
}
