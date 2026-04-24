import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript to Markdown — Obsidian, Notion & Blog Ready | INDXR.AI",
  description:
    "Export YouTube transcripts as clean Markdown with YAML frontmatter, Dataview-compatible properties, and clickable timestamp deep links. Works when Obsidian plugins break. No extension required.",
}

const faqs = [
  {
    q: "Does this work for videos without auto-captions?",
    a: "Yes. Enable AI Transcription before extracting. INDXR.AI uses AssemblyAI Universal-3 Pro, which produces properly punctuated, capitalized text — significantly more readable than auto-captions. The trade-off is cost: 1 credit per minute. For a 60-minute video, that's 60 credits, roughly €0.84 at Basic pricing.",
  },
  {
    q: "What's the difference between plain and timestamps variants?",
    a: "Plain Markdown is continuous paragraphs — no time references, no headers between sections. Best for reading, summarizing, and AI input. The timestamps variant adds a ## [HH:MM:SS](youtube-link) header at the start of each paragraph. Best for Obsidian notes where you want to navigate the transcript and click back to the video.",
  },
  {
    q: "Why don't channel and language appear in AI Transcription exports?",
    a: "Those fields come from YouTube's video metadata, which is retrieved alongside captions during YouTube extraction. When transcribing an audio file or using AI Transcription without caption extraction, there's no YouTube metadata to pull from — so those fields are omitted rather than filled with placeholder values.",
  },
  {
    q: "Is the frontmatter compatible with Obsidian Properties?",
    a: "Yes. Obsidian's Properties panel reads standard YAML frontmatter. duration appears as a number property; created as a date; tags as a multi-select. All fields appear automatically when you open the note.",
  },
  {
    q: "Can I customize which frontmatter fields are exported?",
    a: "Not currently via the UI — INDXR.AI exports a standardized template. You can add fields manually after importing, or use Obsidian's Templater plugin to post-process notes.",
  },
  {
    q: "Why do Obsidian plugins keep breaking for YouTube transcripts?",
    a: "Plugins that work by reading YouTube's page HTML break whenever YouTube changes its frontend. The Obsidian Web Clipper's transcript selector broke twice in early 2026 (Obsidian Forum thread 111550). INDXR.AI retrieves transcripts server-side via YouTube's internal API endpoints, which are not affected by frontend changes.",
  },
]

const sources = [
  {
    label: "Obsidian Forum — YouTube transcript plugin discussion (thread 111550)",
    url: "https://forum.obsidian.md/t/111550",
  },
  {
    label: "Obsidian Dataview — Documentation",
    url: "https://blacksmithgu.github.io/obsidian-dataview/",
  },
]

export default function YouTubeTranscriptMarkdownPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcript to Markdown — Obsidian, Notion & Blog Ready"
      metaDescription="Export YouTube transcripts as clean Markdown with YAML frontmatter, Dataview-compatible properties, and clickable timestamp deep links. Works when Obsidian plugins break. No extension required."
      publishedAt="2026-04-16"
      updatedAt="2026-04-24"
      author={AUTHORS["sarah-lindqvist"]}
      faqs={faqs}
      sources={sources}
    >
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

      <h2>What You Actually Get</h2>

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
transcript_source: "Auto-captions (YouTube)"
created: "2026-04-24"
type: youtube
tags: [youtube, transcript]
---

# Controlling Your Dopamine For Motivation, Focus & Satisfaction

Welcome to the Huberman Lab Podcast, where we discuss science
and science-based tools for everyday life...`}</code></pre>

      <p>And here&apos;s a real export using AI Transcription instead of auto-captions:</p>

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

      <h2>Two Export Variants</h2>

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

      <h2>The Obsidian Workflow</h2>

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
        .
      </p>

      <h2>The Notion Workflow</h2>

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

      <h2>For Blog Posts and Newsletters</h2>

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
        significantly easier to edit. For a 30-minute podcast, the cost is 30 credits — about €0.42
        at Basic pricing.
      </p>

      <h2>When Markdown Is and Isn&apos;t the Right Format</h2>

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

      <p>
        For the Obsidian-specific workflow with step-by-step instructions, see{" "}
        <Link href="/youtube-transcript-obsidian">YouTube Transcript to Obsidian</Link>. For the
        RAG JSON export format, see{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link>. For
        credit packages, see the <Link href="/pricing">pricing page</Link>. For videos that
        don&apos;t have captions, see{" "}
        <Link href="/youtube-transcript-not-available">YouTube Transcript Not Available</Link>.{" "}
        <Link href="/youtube-transcript-generator">Export a YouTube transcript as Markdown</Link>{" "}
        — free for captioned videos, no extension required.
      </p>
    </ToolPageTemplate>
  )
}
