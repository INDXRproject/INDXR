import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"
import { spellCount, EXPORT_FORMAT_COUNT, EXPORT_DOWNLOAD_COUNT } from "@indxr/shared/lib/exportFormats"
import { uploadFormatsProse, UPLOAD_FORMATS_LIST, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { creditCostEur, getAnchorPackage } from "@indxr/shared/lib/pricing"
import { transcriptionModelName } from "@indxr/shared/lib/models"

export const metadata: Metadata = {
  alternates: { canonical: "/articles/transcript-export-formats" },
  title: "Transcript Export Formats — TXT, Markdown, CSV, SRT, JSON, RAG | INDXR.AI",
  description:
    "Every export format for a YouTube transcript in one place: plain text, Markdown with frontmatter, CSV, SRT/VTT subtitles, structured JSON, and RAG-optimized JSON. Real output, real schemas.",
}

const faqs = [
  {
    q: "Is this actually free?",
    a: "For videos with auto-generated captions: yes, completely. No account needed to extract and download as TXT. A free account unlocks all export formats, adds 25 credits for AI transcription testing, and gives access to your personal library — one place for all your transcripts and exports, saved and searchable.",
  },
  {
    q: "What does the plain TXT output look like?",
    a: "A text file with flowing paragraphs — no timestamps, no line numbers. Segments are grouped by natural speech pauses, typically 60 to 90 seconds per paragraph. The result reads like a document rather than a raw caption file.",
  },
  {
    q: "What's the difference between plain and timestamps variants?",
    a: "Plain Markdown is continuous paragraphs — no time references, no headers between sections. Best for reading, summarizing, and AI input. The timestamps variant adds a ## [HH:MM:SS](youtube-link) header at the start of each paragraph. Best for Obsidian notes where you want to navigate the transcript and click back to the video.",
  },
  {
    q: "Is the frontmatter compatible with Obsidian Properties?",
    a: "Yes. Obsidian's Properties panel reads standard YAML frontmatter. duration appears as a number property; created as a date; tags as a multi-select. All fields appear automatically when you open the note.",
  },
  {
    q: "Why do Obsidian plugins keep breaking for YouTube transcripts?",
    a: "Plugins that work by reading YouTube's page HTML break whenever YouTube changes its frontend. The Obsidian Web Clipper's transcript selector broke twice in early 2026 (Obsidian Forum thread 111550). INDXR.AI retrieves transcripts server-side via YouTube's internal API endpoints, which are not affected by frontend changes.",
  },
  {
    q: "Does the CSV include the full video metadata?",
    a: "Not as columns in the main data — only segment_index, start_time, end_time, duration, text, and word_count per segment. For video-level metadata (channel, total duration, language, source URL), export as JSON instead — the JSON format includes a full video metadata wrapper.",
  },
  {
    q: "Does it work for videos in non-Latin scripts?",
    a: "Yes. The UTF-8 BOM encoding handles Arabic, Chinese, Japanese, Korean, Hebrew, and other non-Latin scripts correctly in CSV, SRT, and VTT. Excel opens these files without character encoding issues.",
  },
  {
    q: "Why don't raw YouTube SRT files work well in video editors?",
    a: "YouTube creates subtitle entries every 2–4 seconds for display synchronization during playback. Editors need longer segments — 3–7 seconds — for readable on-screen text. The difference is between a subtitle file designed for watching and one designed for editing. INDXR.AI resegments to the editing standard.",
  },
  {
    q: "What's the maximum characters per line in INDXR.AI's SRT output?",
    a: "42 characters per line, maximum two lines per block — the broadcast industry standard recommended by the BBC Subtitle Guidelines and Netflix Timed Text Style Guide. Lines that would exceed 42 characters are wrapped to a second line rather than truncated.",
  },
  {
    q: "What's the difference between standard JSON and RAG JSON?",
    a: "Standard JSON gives you 2–5 second segments — the raw caption timing. RAG JSON merges those into configurable chunks (30s–120s) with overlap, per-chunk deep links, token count estimates, and flat metadata. Standard JSON is a data format. RAG JSON is a pipeline-ready input.",
  },
  {
    q: "Can I change the chunk size after export?",
    a: "Yes. Set your preferred default in Settings → Developer Exports. You can re-export any saved transcript with a different preset — no re-transcription needed.",
  },
  {
    q: "What embedding model should I use?",
    a: "OpenAI text-embedding-3-small is a practical default for the 200–400 token range our chunks produce. Cohere embed-english-v3.0 and Voyage AI voyage-3 are strong alternatives.",
  },
]

const sources = [
  { label: "YouTube Help — Auto-generated captions", url: "https://support.google.com/youtube/answer/6373554" },
  { label: `${transcriptionModelName()} benchmarks`, url: "https://www.assemblyai.com/benchmarks" },
  { label: "Obsidian Forum — YouTube transcript plugin discussion (thread 111550)", url: "https://forum.obsidian.md/t/111550" },
  { label: "Obsidian Dataview — Documentation", url: "https://blacksmithgu.github.io/obsidian-dataview/" },
  { label: "Voyant Tools — Web-based text analysis environment", url: "https://voyant-tools.org" },
  { label: "BBC Subtitle Guidelines", url: "https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/" },
  { label: "Netflix Timed Text Style Guide", url: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617" },
  { label: "Vectara NAACL 2025 — Chunking strategy benchmark (25 configs × 48 embedding models)", url: "https://arxiv.org/abs/2410.13070" },
  { label: "NVIDIA Technical Blog — Finding the Best Chunking Strategy for Accurate AI Responses", url: "https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses" },
  { label: "Chroma Research — Evaluating Chunking Strategies for Retrieval", url: "https://research.trychroma.com/evaluating-chunking" },
  { label: "Microsoft Azure AI Search — How to chunk documents for vector search", url: "https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents" },
  { label: "LangChain — Document schema concepts", url: "https://python.langchain.com/docs/concepts/documents" },
  { label: "Pinecone — Filter with metadata", url: "https://docs.pinecone.io/guides/data/filter-with-metadata" },
  { label: "ChromaDB — documentation", url: "https://docs.trychroma.com" },
  { label: "Weaviate — documentation", url: "https://weaviate.io/developers/weaviate" },
  { label: "Qdrant — documentation", url: "https://qdrant.tech/documentation" },
]

export default function TranscriptExportFormatsPage() {
  return (
    <ToolPageTemplate
      category="Export Formats"
      slug="transcript-export-formats"
      title="Transcript Export Formats — Every Way to Get a Video's Text Out"
      metaDescription="Every export format for a YouTube transcript in one place: plain text, Markdown with frontmatter, CSV, SRT/VTT subtitles, structured JSON, and RAG-optimized JSON. Real output, real schemas."
      publishedAt="2026-04-16"
      updatedAt="2026-08-07"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Once a transcript exists — whether from YouTube captions or AI transcription —
        it can be exported in {spellCount(EXPORT_FORMAT_COUNT)} file formats, with {spellCount(EXPORT_DOWNLOAD_COUNT)} export options total.
        Every format comes from the same extraction: pick a video once, then download it as
        readable text, structured data, subtitles, or pipeline-ready chunks. This page covers each
        format — what the output actually looks like, and when it&apos;s the right choice.
      </p>

      <p>
        All standard exports (TXT, Markdown, SRT, VTT, CSV, JSON) are included with
        every extraction. RAG JSON is the only exception and is available separately
        — see the <Link href="/pricing">pricing page</Link> for credit costs.
      </p>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>{"What it's for"}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>TXT plain</td><td>Read through a video like a document, or use as a starting point for your own writing</td></tr>
          <tr><td>TXT with timestamps</td><td>Find exactly when something was said — useful for referencing or quoting</td></tr>
          <tr><td>Markdown plain</td><td>{"A text file with the video's metadata in the header — open in any notes app"}</td></tr>
          <tr><td>Markdown with timestamps</td><td>Same as regular Markdown, but with every line time-coded</td></tr>
          <tr><td>SRT</td><td>Add subtitles to a video — works in Premiere Pro, DaVinci Resolve, CapCut</td></tr>
          <tr><td>VTT</td><td>Subtitles for websites and online courses — Canvas, Moodle, Articulate</td></tr>
          <tr><td>CSV</td><td>Every segment as a spreadsheet row — for analysis or bulk processing</td></tr>
          <tr><td>JSON</td><td>{"Structured data with timestamps and video metadata — for developers"}</td></tr>
          <tr><td>JSON RAG</td><td>Chunked and formatted for AI pipelines and vector databases</td></tr>
        </tbody>
      </table>

      {/* ─────────────────────────── Plain text (TXT) ─────────────────────────── */}
      <h2>Plain text (TXT)</h2>

      <p>
        Most tools that extract YouTube captions give you exactly what YouTube gives
        you: hundreds of two-second fragments, each on its own line, strung together
        without structure. INDXR.AI takes that same data and groups it into readable
        paragraphs — the way{" you'd"} actually want to read it.
      </p>

      {/* Side-by-side comparison */}
      <div className="flex flex-col md:flex-row gap-4 my-6 text-sm">
        <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--fg-muted)] mb-3">
            Raw caption output
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-[var(--fg-muted)] leading-relaxed overflow-y-auto max-h-48">{`your excellencies delegates ladies
and gentlemen as you spend the next
two weeks debating negotiating
persuading and compromising
as you surely must its easy
to forget that ultimately the
emergency climate comes down
to a single number the concentration
of carbon in our atmosphere
the measure that greatly determines
global temperature and the changes
in that one number is the clearest
way to chart our own story`}</pre>
        </div>
        <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--fg-muted)] mb-3">
            INDXR.AI plain TXT output
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-[var(--fg)] leading-relaxed overflow-y-auto max-h-48">{`your excellencies delegates ladies and gentlemen as you spend
the next two weeks debating negotiating persuading and
compromising as you surely must its easy to forget that
ultimately the emergency climate comes down to a single number
the concentration of carbon in our atmosphere the measure that
greatly determines global temperature

that number bounced wildly between 180 and 300 and so too did
global temperatures it was a brutal and unpredictable world
at times our ancestors existed only in tiny numbers but just
over 10 000 years ago that number suddenly stabilized`}</pre>
        </div>
      </div>
      <p className="text-sm text-[var(--fg-muted)] -mt-2 mb-6">
        Same source video. Left: raw fragments as delivered by YouTube. Right: INDXR.AI groups them into paragraphs based on natural speech pauses.
      </p>

      <p>
        Plain text is the simplest output: readable paragraphs, no timestamps, no
        line numbers. Good for reading through a video, taking personal notes, or
        using as a starting point for writing. There is also a plain text file with
        timestamps, where every line is time-coded — useful when the exact moment
        something was said needs to be referenced or quoted.
      </p>

      {/* ─────────────────────────── Markdown ─────────────────────────── */}
      <h2>Markdown transcripts</h2>

      <p>
        Getting a YouTube transcript into Obsidian or Notion sounds simple until you try it. The
        Obsidian Web Clipper&apos;s transcript selector broke twice in early 2026 when YouTube updated
        its UI — the community published fixes, and then it broke again. The YTranscript plugin is
        more stable but outputs raw text with no frontmatter and rejects short youtu.be links. Most
        other solutions are browser extensions that stop working the moment YouTube redesigns a
        panel.
      </p>

      <p>
        INDXR.AI exports YouTube transcripts as Markdown files from a server-side pipeline that
        doesn&apos;t depend on your browser, YouTube&apos;s UI, or any extension. Here&apos;s exactly what the
        export contains, what it looks like in your vault, and when it&apos;s the right choice.
      </p>

      <h3>What you actually get</h3>

      <p>
        Every Markdown export contains two things: a YAML frontmatter block at the top, and the
        transcript body below it.
      </p>

      <p>Here&apos;s a real export from a YouTube video with auto-captions:</p>

      <pre className="prose-content-pre"><code>{`---
title: "Controlling Your Dopamine For Motivation, Focus & Satisfaction"
url: "https://www.youtube.com/watch?v=QmOF0crdyRU"
channel: "Huberman Lab"
published: "2021-07-05"
duration: 8191
language: "en"
transcript_source: "YouTube captions"
created: "2026-04-24"
type: youtube
tags: [youtube, transcript]
---

# Controlling Your Dopamine For Motivation, Focus & Satisfaction

Welcome to the Huberman Lab Podcast, where we discuss science
and science-based tools for everyday life...`}</code></pre>

      <p>And here&apos;s a real export using AI Transcription instead of YouTube captions:</p>

      <pre className="prose-content-pre"><code>{`---
title: "Controlling Your Dopamine For Motivation, Focus & Satisfaction"
url: "https://www.youtube.com/watch?v=QmOF0crdyRU"
duration: 8191
transcript_source: "AI Transcription (AssemblyAI)"
created: "2026-04-24"
type: youtube
tags: [youtube, transcript]
---`}</code></pre>

      <p>
        Notice the difference: <code>channel</code>, <code>published</code>, and{" "}
        <code>language</code> are only available when extracting via YouTube captions — those fields
        come from YouTube&apos;s video metadata. When using AI Transcription on a video file or audio
        upload, that metadata isn&apos;t available, so those fields are omitted rather than set to null.
        What you see is what you get.
      </p>

      <p>
        The <code>transcript_source</code> field tells you how the transcript was produced.{" "}
        <code>duration</code> is stored as a number in seconds — directly usable in Dataview
        calculations. <code>created</code> is the date you ran the extraction, not the video&apos;s
        publish date.
      </p>

      <h3>Two export variants</h3>

      <p>
        <strong>Markdown — Plain</strong> outputs the transcript as continuous paragraphs, grouped
        by natural pauses in speech (gaps longer than 5 seconds trigger a new paragraph). No
        timestamps, no headers — clean prose for pasting into blog editors, feeding to AI tools, or
        creating summaries.
      </p>

      <p>
        <strong>Markdown — With Timestamps</strong> adds a clickable <code>## [HH:MM:SS]</code>{" "}
        header at the start of each paragraph. Here&apos;s what that looks like:
      </p>

      <pre className="prose-content-pre"><code>{`## [00:00:00](https://youtu.be/QmOF0crdyRU?t=0)
Welcome to the Huberman Lab Podcast, where we discuss science
and science-based tools for everyday life...

## [00:04:23](https://youtu.be/QmOF0crdyRU?t=263)
Most people have heard of dopamine, and we hear all the time
now about dopamine hits, but actually there's no such thing...`}</code></pre>

      <p>
        Each timestamp is a real link. In Obsidian, clicking{" "}
        <code>[00:04:23](https://youtu.be/...)</code> opens that exact moment in the video in your
        browser. This is not a feature any Obsidian plugin currently offers — it requires knowing
        the timestamp and constructing the <code>?t=</code> URL at export time, which INDXR.AI does
        automatically.
      </p>

      <h3>The Obsidian workflow</h3>

      <p>
        <strong>Step 1 — Extract.</strong> Paste the YouTube URL into INDXR.AI. For videos with
        auto-captions, extraction is free and takes a few seconds. For videos without captions,
        enable AI Transcription (1 credit per minute) before extracting.
      </p>

      <p>
        <strong>Step 2 — Export.</strong> Click Export → Markdown. Choose &quot;With Timestamps&quot; for
        notes you&apos;ll review and navigate, or &quot;Plain&quot; for content you&apos;ll summarize or repurpose.
        The .md file downloads immediately.
      </p>

      <p>
        <strong>Step 3 — Drop into your vault.</strong> Drag the file into a{" "}
        <code>Clippings/Videos/</code> folder in your vault. Obsidian indexes the frontmatter
        automatically — no setup required.
      </p>

      <p>
        <strong>Step 4 — Query with Dataview.</strong> All frontmatter fields are immediately
        available. Some useful queries:
      </p>

      <p>List all video notes, most recent first:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, round(duration / 60) AS "Minutes", transcript_source
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC`}</code></pre>

      <p>Find all videos from a specific channel:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, url, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE channel = "Huberman Lab"
SORT created DESC`}</code></pre>

      <p>Videos over 45 minutes not yet processed:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE type = "youtube" AND duration > 2700 AND !contains(tags, "processed")
SORT created DESC`}</code></pre>

      <p>
        Dataview reads all YAML frontmatter automatically — no configuration needed. Source:{" "}
        <a
          href="https://blacksmithgu.github.io/obsidian-dataview/"
          target="_blank"
          rel="noopener noreferrer"
        >
          blacksmithgu.github.io/obsidian-dataview
        </a>
        . For the full end-to-end Obsidian setup, see{" "}
        <Link href="/articles/youtube-transcript-obsidian">YouTube Transcript to Obsidian</Link>.
      </p>

      <h3>The Notion workflow</h3>

      <p>
        Notion doesn&apos;t automatically map YAML frontmatter to database properties. There are three
        ways to work with the export.
      </p>

      <p>
        <strong>Import as a page.</strong> Settings → Import → Text &amp; Markdown → upload the
        .md file. Notion creates a page with the transcript body formatted correctly. The YAML block
        appears as a code block at the top, which you can delete and manually fill in the database
        properties.
      </p>

      <p>
        <strong>Copy-paste.</strong> For one-off videos, open the file in any text editor, select
        all, paste directly into a Notion page. Formatting renders cleanly.
      </p>

      <p>
        <strong>Notion API.</strong> For automated pipelines, use Notion&apos;s API with the{" "}
        <code>markdown</code> parameter. A <code>POST /v1/pages</code> request can include both
        Markdown content and page properties in one call.
      </p>

      <p>
        For a video database in Notion, the properties that map directly to INDXR.AI&apos;s export
        fields are: Title, URL, Channel, Published Date, Duration, and Tags.
      </p>

      <h3>For blog posts and newsletters</h3>

      <p>
        The plain Markdown export is the cleanest starting point for content repurposing. Paragraphs
        are grouped by natural speech pauses, HTML entities are decoded, and there&apos;s no timestamp
        clutter.
      </p>

      <p>
        A straightforward workflow: extract transcript → export as plain Markdown → paste into
        Claude or ChatGPT with a prompt like &quot;Rewrite this transcript as a blog post, keeping the
        main arguments and removing filler.&quot; You get a rough draft in seconds.
      </p>

      <p>
        Ghost, Substack, and WordPress all accept Markdown input natively. Ghost uses Markdown as
        its primary editor format. Substack renders pasted Markdown with formatting intact.
      </p>

      <p>
        One honest note: auto-caption transcripts don&apos;t have punctuation or capitalization. The
        paragraphs are readable but the text isn&apos;t polished. If you&apos;re repurposing content for
        publication, AI Transcription produces text with proper sentence structure that&apos;s
        significantly easier to edit. For a 30-minute podcast, the cost is 30 credits — about
        {" "}{creditCostEur(30)} at {getAnchorPackage().name} pricing.
      </p>

      <h3>When Markdown is and isn&apos;t the right format</h3>

      <table>
        <thead>
          <tr>
            <th>Use case</th>
            <th>Recommended format</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Obsidian vault with Dataview</td><td>Markdown with timestamps</td></tr>
          <tr><td>Notion video database</td><td>Markdown (plain or timestamps)</td></tr>
          <tr><td>Blog/newsletter repurposing</td><td>Markdown plain</td></tr>
          <tr><td>AI summarization / ChatGPT input</td><td>Markdown plain or TXT</td></tr>
          <tr><td>Video editing / subtitle sync</td><td>SRT or VTT</td></tr>
          <tr><td>Data analysis / research</td><td>CSV</td></tr>
          <tr><td>RAG pipeline / vector database</td><td>RAG JSON</td></tr>
          <tr><td>Developer integration</td><td>JSON</td></tr>
        </tbody>
      </table>

      {/* ─────────────────────────── CSV ─────────────────────────── */}
      <h2>CSV export</h2>

      <p>
        A plain text transcript is readable. A CSV transcript is analyzable. If you&apos;re doing
        computational text analysis, word frequency counts, timestamp-based research annotation, or
        corpus analysis across multiple videos, the CSV export gives you the structured data you
        need without manual reformatting.
      </p>

      <p>
        INDXR.AI exports YouTube transcripts as properly-structured CSV files with segment index,
        start time, end time, text, and word count per segment.
      </p>

      <h3>What the CSV contains</h3>

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

      <p>
        <strong>Encoding:</strong> UTF-8 with BOM (Byte Order Mark). This matters for Excel
        compatibility — without BOM, Excel frequently misinterprets UTF-8 encoded files and displays
        garbled text for non-Latin characters (Arabic, Chinese, Japanese, Korean, and others).
        Google Sheets handles UTF-8 with or without BOM correctly.
      </p>

      <h3>Opening in Excel, Google Sheets, Python, and R</h3>

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

      <h3>Common research use cases</h3>

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
        <strong>Corpus analysis across multiple videos.</strong> Extract a playlist and download each
        video as a separate CSV. Combine them in Python or R to compare vocabulary, speaking pace
        (words per minute derived from <code>word_count / duration</code>), or topic distribution
        across a speaker&apos;s output over time.
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

      <h3>YouTube captions vs. AI Transcription for CSV</h3>

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

      {/* ─────────────────────────── SRT / VTT ─────────────────────────── */}
      <h2>SRT and VTT subtitles</h2>

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

      <h3>The problem with raw YouTube subtitle files</h3>

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
        Professional subtitle standards (
        <a href="https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/" target="_blank" rel="noopener noreferrer">BBC Subtitle Guidelines</a>,{" "}
        <a href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617" target="_blank" rel="noopener noreferrer">Netflix Timed Text Style Guide</a>,
        EBU Tech 3264) call for blocks of 3–7 seconds, a maximum of two lines, and 42 characters
        per line. These standards exist because human readers need time to read and comprehend text
        before it disappears.
      </p>

      <h3>What INDXR.AI exports</h3>

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
        The resegmentation strategy depends on the transcript source. For AI Transcription
        (AssemblyAI), segments are merged until a sentence boundary is detected — a block closes on
        a period, question mark, or exclamation point, producing semantically complete subtitle units
        of 3–7 seconds. For auto-captions, which have no punctuation, a time-based merge is used
        instead: segments accumulate until the block reaches 3 seconds. Both approaches are a
        significant improvement over raw 2-second YouTube segments, but AI Transcription produces
        cleaner sentence-aligned blocks.
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

      <h3>When auto-captions don&apos;t exist</h3>

      <p>
        Plenty of YouTube videos have no auto-generated captions — non-English content YouTube
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
        confirm the credit cost (1 credit per minute), and the audio is transcribed by{" "}
        {transcriptionModelName()}. The resulting SRT/VTT is higher quality than auto-caption output — proper
        punctuation, accurate word boundaries, and clean segment timing.
      </p>

      <p>
        For audio files you&apos;ve already downloaded, the{" "}
        <Link href="/articles/audio-to-text">Upload tab</Link> accepts {uploadFormatsProse("and")}{" "}
        files up to {UPLOAD_MAX_FILE_MB}MB and produces the same resegmented SRT/VTT output.
      </p>

      <h3>Compatibility with video editors</h3>

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

      {/* ─────────────────────────── JSON ─────────────────────────── */}
      <h2>JSON export</h2>

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

      <h3>Standard JSON — free for captioned videos</h3>

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
        <strong>For non-English videos:</strong> INDXR anchors to the video&apos;s native caption track, so
        caption extraction returns the <strong>original language</strong> — not the English translation
        that tools relying on YouTube&apos;s translatable track tend to get. If a video has no captions at
        all, use AI Transcription, which reads the audio directly in the original language. See{" "}
        <Link href="/articles/youtube-transcript-non-english">non-English transcripts</Link> for the full
        explanation.
      </p>

      <p>
        <strong>Cost: Free.</strong> No credits, no account required for a single video.
      </p>

      <h3>AI Transcription + standard JSON — 1 credit per minute</h3>

      <p>
        When you enable AI Transcription, INDXR.AI downloads the video audio and runs it through{" "}
        <a
          href="https://www.assemblyai.com/docs/supported-languages"
          target="_blank"
          rel="noopener noreferrer"
        >
          {transcriptionModelName()}
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
            <th>Cost at {getAnchorPackage().name} pricing</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10 min</td>
            <td>10</td>
            <td>{creditCostEur(10)}</td>
          </tr>
          <tr>
            <td>30 min</td>
            <td>30</td>
            <td>{creditCostEur(30)}</td>
          </tr>
          <tr>
            <td>1 hour</td>
            <td>60</td>
            <td>{creditCostEur(60)}</td>
          </tr>
          <tr>
            <td>2 hours</td>
            <td>120</td>
            <td>{creditCostEur(120)}</td>
          </tr>
        </tbody>
      </table>

      <h3>What you&apos;d add yourself</h3>

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

      {/* ─────────────────────────── RAG JSON ─────────────────────────── */}
      <h2>RAG-optimized JSON</h2>

      <p>
        Raw YouTube transcripts are not RAG-ready. YouTube returns transcripts as 2–5 second segments
        — fragments of roughly 8–20 tokens each. Embedding models work best with 200–400 tokens of
        coherent text (
        <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener noreferrer">
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
        ,{" "}
        <a
          href="https://research.trychroma.com/evaluating-chunking"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chroma Research
        </a>
        ,{" "}
        <a
          href="https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents"
          target="_blank"
          rel="noopener noreferrer"
        >
          Microsoft Azure AI Search
        </a>
        ). Feed them 15-token fragments and your retrieval quality degrades immediately: queries
        can&apos;t match context that&apos;s been cut into arbitrary pieces, and there&apos;s no
        metadata to filter by video, channel, or timestamp.
      </p>

      <p>
        Every developer building a YouTube-based RAG pipeline hits this problem and solves it
        manually: merge segments, pick a chunk size, handle overlap, attach metadata, format for the
        vector database. INDXR.AI&apos;s RAG JSON export does that in one click.
      </p>

      <h3>What the output actually looks like</h3>

      <p>
        Here&apos;s a real chunk from a 3Blue1Brown neural networks video (19 min, AssemblyAI
        transcription, 60s preset):
      </p>

      <pre className="prose-content-pre"><code>{`{
  "metadata": {
    "video_id": "aircAruvnKk",
    "title": "But what is a neural network? | Deep learning chapter 1",
    "duration_seconds": 1119,
    "extraction_method": "assemblyai",
    "extracted_at": "2026-04-23T18:55:35.850Z",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "sentence_boundary",
      "total_chunks": 18
    }
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "aircAruvnKk_chunk_000",
      "text": "This is a 3. It's sloppily written and rendered at an extremely low resolution of 28x28 pixels, but your brain has no trouble recognizing it as a 3. And I want you to take a moment to appreciate how crazy it is that brains can do this so effortlessly...",
      "start_time": 4.434,
      "end_time": 67.98,
      "deep_link": "https://youtu.be/aircAruvnKk?t=4",
      "token_count_estimate": 251,
      "metadata": {
        "video_id": "aircAruvnKk",
        "title": "But what is a neural network? | Deep learning chapter 1",
        "chunk_index": 0,
        "total_chunks": 18,
        "start_time": 4.434,
        "end_time": 67.98,
        "language": null
      }
    }
  ]
}`}</code></pre>

      <p>A few things worth noting directly.</p>

      <p>
        <strong><code>deep_link</code> is pre-constructed per chunk.</strong> Click it and you land
        on the exact second the chunk starts in the video. When your LLM cites a source, it can link
        to the moment, not just the video page.
      </p>

      <p>
        <strong><code>metadata</code> is flat.</strong> Vector databases require scalar key-value
        pairs — no nested objects. The structure here loads directly into{" "}
        <a href="https://docs.pinecone.io/guides/data/upsert-data" target="_blank" rel="noopener noreferrer">
          Pinecone
        </a>
        ,{" "}
        <a href="https://docs.trychroma.com" target="_blank" rel="noopener noreferrer">
          ChromaDB
        </a>
        ,{" "}
        <a href="https://weaviate.io/developers/weaviate" target="_blank" rel="noopener noreferrer">
          Weaviate
        </a>
        , and{" "}
        <a href="https://qdrant.tech/documentation" target="_blank" rel="noopener noreferrer">
          Qdrant
        </a>{" "}
        without transformation.
      </p>

      <p>
        <strong><code>token_count_estimate</code></strong> uses the cl100k_base approximation (~1.33
        tokens per word). It lets you verify chunks fit your embedding model&apos;s context window
        without running a tokenizer yourself.
      </p>

      <p>
        <strong><code>overlap_strategy</code></strong> tells you how the overlap was computed. For
        AssemblyAI transcripts with punctuation, we use sentence-boundary detection — the overlap
        ends on a complete sentence. For auto-caption transcripts without punctuation, we use
        segment-boundary overlap instead.
      </p>

      <h3>Chunk size options</h3>

      <p>
        Four presets, configurable in Settings → Developer Exports:
      </p>

      <table>
        <thead>
          <tr>
            <th>Preset</th>
            <th>Duration</th>
            <th>~Tokens</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Quote</td>
            <td>30s</td>
            <td>~100</td>
            <td>Short-form content, granular retrieval</td>
          </tr>
          <tr>
            <td>Balanced</td>
            <td>60s</td>
            <td>~200</td>
            <td>Default — works across most use cases</td>
          </tr>
          <tr>
            <td>Precise</td>
            <td>90s</td>
            <td>~300</td>
            <td>Inside the research-backed sweet spot</td>
          </tr>
          <tr>
            <td>Context</td>
            <td>120s</td>
            <td>~400</td>
            <td>Lectures, long-form analysis</td>
          </tr>
        </tbody>
      </table>

      <p>
        The 60s default balances retrieval granularity with semantic completeness. For lecture
        content like the Karpathy GPT video (1h56m), 90s produced 89 chunks with ~400 tokens each —
        the range that performs best for analytical queries according to{" "}
        <a
          href="https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses"
          target="_blank"
          rel="noopener noreferrer"
        >
          NVIDIA&apos;s 2024 benchmark
        </a>
        .
      </p>

      <h3>Loading into LangChain</h3>

      <p>
        Each chunk maps directly to{" "}
        <a
          href="https://python.langchain.com/docs/concepts/documents"
          target="_blank"
          rel="noopener noreferrer"
        >
          LangChain&apos;s Document schema
        </a>
        :
      </p>

      <pre className="prose-content-pre"><code>{`import json
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

with open("transcript_rag.json") as f:
    data = json.load(f)

documents = [
    Document(
        page_content=chunk["text"],
        metadata=chunk["metadata"]
    )
    for chunk in data["chunks"]
]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(documents, embeddings)

results = vectorstore.similarity_search(
    "What is the core challenge with raw transcripts?",
    k=3
)

for doc in results:
    print(f"[{doc.metadata['start_time']}s] {doc.page_content[:200]}")`}</code></pre>

      <h3>Loading into Pinecone</h3>

      <pre className="prose-content-pre"><code>{`import json
from openai import OpenAI
from pinecone import Pinecone

with open("transcript_rag.json") as f:
    data = json.load(f)

client = OpenAI()
pc = Pinecone(api_key="YOUR_API_KEY")
index = pc.Index("youtube-transcripts")

vectors = []
for chunk in data["chunks"]:
    embedding = client.embeddings.create(
        input=chunk["text"],
        model="text-embedding-3-small"
    ).data[0].embedding

    vectors.append({
        "id": chunk["chunk_id"],
        "values": embedding,
        "metadata": chunk["metadata"]
    })

for i in range(0, len(vectors), 100):
    index.upsert(vectors=vectors[i:i+100])`}</code></pre>

      <h3>YouTube captions vs. AI Transcription for RAG</h3>

      <p>The difference matters more for RAG than for any other use case.</p>

      <p>
        Auto-captions lack punctuation. Text arrives as lowercase words without sentence boundaries.
        When the chunker tries to detect where sentences end for overlap computation, it can&apos;t —
        so it falls back to segment-boundary overlap instead. The chunks still work, but the overlap
        is less semantically clean.
      </p>

      <p>
        Auto-captions are also less accurate than AssemblyAI, particularly for accents, domain
        vocabulary, and fast speech. Errors propagate into your embeddings.
      </p>

      <p>
        For RAG pipelines where retrieval quality matters, use AI Transcription. The resulting chunks
        have proper sentence boundaries, accurate text, and sentence-level overlap. For a 19-minute
        video, AI Transcription costs 19 credits — roughly {creditCostEur(19)} at {getAnchorPackage().name} pricing.
      </p>

      <p>
        One specific case where auto-captions are fine: if your downstream pipeline does its own text
        cleaning and doesn&apos;t rely on sentence boundaries for chunking decisions.
      </p>

      <h3>RAG JSON pricing</h3>

      <p>
        RAG JSON export: 1 credit per 10 minutes of video, minimum 1.
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0–10 min</td><td>1 credit</td></tr>
          <tr><td>11–20 min</td><td>2 credits</td></tr>
          <tr><td>21–30 min</td><td>3 credits</td></tr>
          <tr><td>31–60 min</td><td>6 credits</td></tr>
          <tr><td>1h56min (Karpathy GPT)</td><td>12 credits</td></tr>
          <tr><td>2h49min (Joe Rogan Snowden)</td><td>17 credits</td></tr>
        </tbody>
      </table>

      <p>Re-downloading a transcript you&apos;ve already exported is free. Credits never expire.</p>

      <p>
        For a deep dive into chunk size research and overlap strategy, see{" "}
        <Link href="/articles/chunk-youtube-transcripts-for-rag">
          How to Chunk YouTube Transcripts for RAG
        </Link>
        .
      </p>

      {/* ─────────────────────────── Close ─────────────────────────── */}
      <h2>Getting started</h2>

      <p>
        For playlists, the{" "}
        <Link href="/articles/youtube-playlist-transcript">Playlist tab</Link> processes all
        selected videos in one job, and every format is available in bulk — select the transcripts
        in your library and download a ZIP with one file per video. For audio files from any source,
        the <Link href="/articles/audio-to-text">Upload tab</Link> accepts {UPLOAD_FORMATS_LIST}{" "}
        up to {UPLOAD_MAX_FILE_MB}MB and produces the same formats.
      </p>

      <p>
        Everything you extract is saved to your library — a personal archive of all
        your transcripts, searchable and accessible from any device.{" "}
        <Link href="/signup">Sign up</Link> for a free account to get started: 25
        credits included, no payment or credit card required. For credit packages, see the{" "}
        <Link href="/pricing">pricing page</Link>; for a full overview of the extraction pipeline,
        see <Link href="/docs/how-indxr-works">how INDXR.AI works</Link>.
      </p>
    </ToolPageTemplate>
  )
}
