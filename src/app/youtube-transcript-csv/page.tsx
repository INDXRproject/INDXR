import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "Download YouTube Transcript as CSV — Spreadsheet-Ready for Research | INDXR.AI",
  description:
    "Export YouTube transcripts as CSV with segment index, start and end timestamps, text, and word count. UTF-8 BOM for Excel compatibility. Works for single videos and playlists.",
}

const faqs = [
  {
    q: "Is CSV export free?",
    a: "Yes. Like all export formats, CSV export has no additional credit cost beyond the base extraction. Auto-caption extraction is free; AI Transcription costs 1 credit per minute. Once you have a transcript in your library, you can export it as CSV (or any other format) at any time at no additional cost.",
  },
  {
    q: "Why is end_time included when I can calculate it from start_time + duration?",
    a: "Convenience. The calculation is trivial but having end_time as a pre-computed column saves repeated formula work in Excel and eliminates a transformation step in pandas or R. Both values are included because downstream tools may need either form.",
  },
  {
    q: "Does the CSV include the full video metadata?",
    a: "Not as columns in the main data — only segment_index, start_time, end_time, duration, text, and word_count per segment (plus video_id and video_title for playlists). For video-level metadata (channel, total duration, language, source URL), export as JSON instead — the JSON format includes a full video metadata wrapper.",
  },
  {
    q: "Does it work for videos in non-Latin scripts?",
    a: "Yes. The UTF-8 BOM encoding handles Arabic, Chinese, Japanese, Korean, Hebrew, and other non-Latin scripts correctly. Excel opens these files without character encoding issues.",
  },
  {
    q: "Can I export a playlist as a single merged CSV?",
    a: 'Yes. After playlist extraction, the bulk export options include both "one file per video (ZIP)" and "merged single CSV." The merged CSV includes video_id and video_title columns so you can identify and filter by source video.',
  },
]

const sources = [
  {
    label: "Voyant Tools — Web-based text analysis environment",
    url: "https://voyant-tools.org",
  },
]

export default function YouTubeTranscriptCsvPage() {
  return (
    <ToolPageTemplate
      title="Download YouTube Transcripts as CSV — Spreadsheet-Ready Data"
      metaDescription="Export YouTube transcripts as CSV with segment index, start and end timestamps, text, and word count. UTF-8 BOM for Excel compatibility. Works for single videos and playlists."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["alex-mercer"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        A plain text transcript is readable. A CSV transcript is analyzable. If you&apos;re doing
        computational text analysis, word frequency counts, timestamp-based research annotation, or
        corpus analysis across multiple videos, the CSV export gives you the structured data you
        need without manual reformatting.
      </p>

      <p>
        INDXR.AI exports YouTube transcripts as properly-structured CSV files with segment index,
        start time, end time, text, and word count per segment. For playlist exports,{" "}
        <code>video_id</code> and <code>video_title</code> columns are added so you can work with
        multiple videos in a single file.
      </p>

      <h2>What the CSV Contains</h2>

      <p>
        Each row in the CSV represents one transcript segment — a continuous unit of speech as
        detected by YouTube&apos;s captioning system or AssemblyAI&apos;s speech recognition.
      </p>

      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>segment_index</code></td>
            <td>Integer</td>
            <td>Sequential position of this segment (0-indexed)</td>
          </tr>
          <tr>
            <td><code>start_time</code></td>
            <td>Float</td>
            <td>Start time in seconds (e.g., 0.0, 14.3, 247.8)</td>
          </tr>
          <tr>
            <td><code>end_time</code></td>
            <td>Float</td>
            <td>End time in seconds (start + duration)</td>
          </tr>
          <tr>
            <td><code>duration</code></td>
            <td>Float</td>
            <td>Length of this segment in seconds</td>
          </tr>
          <tr>
            <td><code>text</code></td>
            <td>String</td>
            <td>Transcript text for this segment</td>
          </tr>
          <tr>
            <td><code>word_count</code></td>
            <td>Integer</td>
            <td>Number of words in this segment</td>
          </tr>
        </tbody>
      </table>

      <p>For playlist exports, two additional columns prepend the above:</p>

      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>video_id</code></td>
            <td>String</td>
            <td>YouTube video ID (e.g., dQw4w9WgXcQ)</td>
          </tr>
          <tr>
            <td><code>video_title</code></td>
            <td>String</td>
            <td>Title of the video this segment belongs to</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Encoding:</strong> UTF-8 with BOM (Byte Order Mark). This matters for Excel
        compatibility — without BOM, Excel frequently misinterprets UTF-8 encoded files and displays
        garbled text for non-Latin characters (Arabic, Chinese, Japanese, Korean, and others).
        Google Sheets handles UTF-8 with or without BOM correctly.
      </p>

      <h2>Opening in Excel, Google Sheets, Python, and R</h2>

      <p>
        <strong>Excel:</strong> Double-clicking the CSV file opens it correctly in most Excel
        versions because of the UTF-8 BOM. If the formatting looks wrong, use Data → From Text/CSV
        and specify UTF-8 encoding manually.
      </p>

      <p>
        <strong>Google Sheets:</strong> File → Import → Upload. Sheets detects the encoding
        automatically and imports cleanly.
      </p>

      <p><strong>Python/pandas:</strong></p>

      <pre className="prose-content-pre"><code>{`import pandas as pd

df = pd.read_csv("transcript.csv", encoding="utf-8-sig")  # utf-8-sig handles BOM
print(df.head())
print(f"Total segments: {len(df)}")
print(f"Total words: {df['word_count'].sum()}")
print(f"Duration: {df['end_time'].max():.1f} seconds")`}</code></pre>

      <p><strong>R:</strong></p>

      <pre className="prose-content-pre"><code>{`library(readr)
df <- read_csv("transcript.csv", locale = locale(encoding = "UTF-8"))`}</code></pre>

      <h2>Common Research Use Cases</h2>

      <p>
        <strong>Computational text analysis.</strong> Load the CSV into{" "}
        <a href="https://voyant-tools.org" target="_blank" rel="noopener noreferrer">
          Voyant Tools
        </a>
        , DARIAH&apos;s Topic Explorer, or a Python NLP pipeline. The structured format — one segment per
        row with timestamps — makes it straightforward to apply word frequency analysis,
        keyword-in-context, topic modeling, or sentiment analysis with temporal context.
      </p>

      <p>
        <strong>Corpus analysis across multiple videos.</strong> Extract a playlist and download the
        combined CSV with <code>video_id</code> and <code>video_title</code> columns. Filter by
        video in Excel, Python, or R to compare vocabulary, speaking pace (words per minute derived
        from <code>word_count / duration</code>), or topic distribution across a speaker&apos;s output
        over time.
      </p>

      <p>
        <strong>Timestamped annotation.</strong> The <code>start_time</code> and{" "}
        <code>end_time</code> columns let you link analysis results back to specific moments in the
        video. A keyword that appears at segment index 47 starting at 284.2 seconds maps to a
        specific YouTube timestamp — useful for academic citation or user-facing applications that
        want to surface the relevant video moment.
      </p>

      <p>
        <strong>Subtitle timing analysis.</strong> For researchers studying accessibility or
        subtitle quality, the segment timing data reveals patterns in how YouTube&apos;s auto-captioning
        system breaks speech — average segment lengths, variance, gaps between segments.
      </p>

      <h2>Auto-Captions vs. AI Transcription for CSV</h2>

      <p>
        The same quality distinction that applies to other export formats applies here. Auto-caption
        CSV files will have unpunctuated lowercase text and segments of 2–5 seconds. AI
        transcription CSV files have properly punctuated text and more natural segment boundaries.
      </p>

      <p>
        For text analysis tasks that don&apos;t depend on punctuation (word frequency, keyword search,
        topic modeling), auto-caption CSV is often sufficient and costs nothing. For tasks that rely
        on sentence structure — readability scoring, syntactic analysis, named entity recognition —
        AI transcription produces meaningfully better input data.
      </p>

      <h2>Playlist CSV Export</h2>

      <p>
        For playlist extractions, you can download all video CSVs as a ZIP (one file per video) or
        as a single merged CSV with <code>video_id</code> and <code>video_title</code> columns. The
        merged option is useful for cross-video analysis — a single DataFrame in pandas covering an
        entire lecture series or research corpus, with video identity preserved in each row.
      </p>

      <p>
        To extract a playlist and download as CSV, see{" "}
        <Link href="/bulk-youtube-transcript">Bulk YouTube Transcript</Link>. For structured JSON
        with full metadata wrapper, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON Export</Link>.
      </p>
    </ToolPageTemplate>
  )
}
