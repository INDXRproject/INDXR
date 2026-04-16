import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript to Markdown — Obsidian, Notion & Blog Ready | INDXR.AI",
  description:
    "Export YouTube transcripts as clean Markdown with YAML frontmatter. Dataview-compatible properties, works when Obsidian plugins break. No extension required.",
}

const faqs = [
  {
    q: "Does the Markdown export work for videos without auto-captions?",
    a: "Yes. Enable AI Transcription before extracting — INDXR.AI uses AssemblyAI Universal-3 Pro to transcribe the audio. The resulting Markdown is higher quality than auto-caption exports because AssemblyAI adds proper punctuation and sentence boundaries. Cost: 1 credit per minute of video.",
  },
  {
    q: "What's the difference between Markdown plain and Markdown with timestamps?",
    a: "Plain Markdown outputs the transcript as continuous paragraphs with no time references — ideal for blog posts, summaries, and AI input. Markdown with timestamps adds [HH:MM:SS] at the start of each segment, with each timestamp on its own line — ideal for Obsidian notes where you want to jump to specific moments in the video.",
  },
  {
    q: "Is the YAML frontmatter compatible with Obsidian Properties (the new GUI panel)?",
    a: "Yes. Obsidian's Properties panel reads standard YAML frontmatter. All fields from INDXR.AI's export will appear in the Properties panel automatically. The duration field (stored as a number in seconds) will appear as a number property.",
  },
  {
    q: "Can I customize the YAML frontmatter fields?",
    a: "Not currently via the export UI — INDXR.AI exports a standardized template. You can add fields manually after importing, or use Obsidian's Templater plugin to apply a post-processing template. Customizable frontmatter is on the roadmap.",
  },
  {
    q: "Why doesn't Obsidian Web Clipper work reliably for YouTube transcripts?",
    a: "The Web Clipper extracts transcripts by targeting specific HTML elements in YouTube's page DOM. YouTube updates its frontend without notice, which changes or removes these elements. INDXR.AI retrieves transcripts server-side via YouTube's internal API, which is not affected by frontend UI changes.",
  },
  {
    q: "Do I need a browser extension to use INDXR.AI?",
    a: "No. INDXR.AI is a web tool — paste a YouTube URL, get a transcript, download the Markdown. No extension, no installation, no account required for a single free extraction. Markdown export requires a free account.",
  },
]

const sources = [
  {
    label: "Obsidian Forum — YouTube transcript plugin discussion",
    url: "https://forum.obsidian.md/t/111550",
  },
  {
    label: "Obsidian Dataview — Documentation",
    url: "https://blacksmithgu.github.io/obsidian-dataview",
  },
]

export default function YouTubeTranscriptMarkdownPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcript to Markdown — Export Ready for Obsidian, Notion & Your Blog"
      metaDescription="Export YouTube transcripts as clean Markdown with YAML frontmatter. Dataview-compatible properties, works when Obsidian plugins break. No extension required."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["sarah-lindqvist"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Getting a YouTube transcript into Obsidian or Notion sounds simple until you try it. The
        Obsidian Web Clipper&apos;s transcript selector has broken twice in early 2026 due to YouTube UI
        changes. The YTranscript plugin requires a specific URL format and generates no YAML
        frontmatter. Most other solutions are Chrome extensions that stop working the moment YouTube
        updates its DOM.
      </p>

      <p>
        INDXR.AI exports YouTube transcripts directly as Markdown — with YAML frontmatter included,
        from a server-side pipeline that doesn&apos;t depend on browser extensions or fragile CSS
        selectors. It works for videos without captions too, using AI transcription as a fallback.
      </p>

      <h2>What the Markdown Export Contains</h2>

      <p>
        Every Markdown export from INDXR.AI includes a YAML frontmatter block at the top, followed
        by the transcript body. The frontmatter fields are chosen specifically for Obsidian Dataview
        compatibility and Notion property mapping.
      </p>

      <p>A standard export looks like this:</p>

      <pre className="prose-content-pre"><code>{`---
title: "How to Build a Second Brain — Full Course"
source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
channel: "Tiago Forte"
duration: 5463
language: "en"
type: youtube
created: "2026-04-15T14:32:00Z"
tags: [youtube, transcript]
---

## Transcript

[00:00:00] Welcome to the full course on building a second brain...

[00:02:15] The first principle is that your brain is for having ideas, not storing them...`}</code></pre>

      <p>
        The <code>source</code> field uses the full canonical YouTube URL — directly linkable.{" "}
        <code>duration</code> is stored in seconds as a number so Dataview can sort and filter by
        length. <code>type: youtube</code> lets you distinguish video notes from other content types
        in your vault. The <code>created</code> timestamp records when you extracted the transcript,
        not when the video was published — add a <code>published</code> field manually if you need
        the upload date.
      </p>

      <p>
        Two variants are available: plain Markdown (one continuous block, ideal for pasting into
        blog posts or feeding to AI tools) and Markdown with timestamps (each line prefixed with{" "}
        <code>[HH:MM:SS]</code>, ideal for Obsidian notes where you want to reference specific
        moments).
      </p>

      <h2>Why Existing Obsidian Plugins Break</h2>

      <p>
        The core problem is that every plugin-based approach scrapes YouTube&apos;s frontend, and YouTube
        changes that frontend frequently.
      </p>

      <p>
        The Obsidian Web Clipper uses a CSS selector targeting the transcript panel DOM element.
        When YouTube updated its UI in February 2026, the <code>target-id</code> attribute changed,
        breaking every existing template. The community scrambled to update selectors — and then it
        broke again weeks later (
        <a
          href="https://forum.obsidian.md/t/111550"
          target="_blank"
          rel="noopener noreferrer"
        >
          Obsidian Forum, thread 111550
        </a>
        ). The transcript panel also has to be manually opened before clipping, or the selector
        returns nothing.
      </p>

      <p>
        The YTranscript plugin uses YouTube&apos;s InnerTube API directly rather than DOM scraping, which
        makes it more stable. But it requires full <code>youtube.com/watch?v=</code> URLs — short{" "}
        <code>youtu.be</code> links and URLs with tracking parameters (<code>?si=</code>) cause
        Status 400 errors. It also inserts transcript text as a flat block with no YAML frontmatter,
        so you get raw text in your note but none of the structured metadata Dataview needs.
      </p>

      <p>
        INDXR.AI runs server-side via yt-dlp and residential proxies, bypassing browser-level
        restrictions entirely. It doesn&apos;t break when YouTube updates its UI. It also handles videos
        without captions through AssemblyAI&apos;s speech recognition — something no browser plugin can
        do.
      </p>

      <h2>The Obsidian Workflow</h2>

      <p>Getting a YouTube transcript into your Obsidian vault with INDXR.AI takes four steps.</p>

      <p>
        <strong>Step 1: Extract the transcript.</strong> Paste the YouTube URL into INDXR.AI. If the
        video has auto-captions, extraction is free and takes a few seconds. If it doesn&apos;t, enable AI
        Transcription (1 credit per minute) and confirm.
      </p>

      <p>
        <strong>Step 2: Export as Markdown.</strong> Once the transcript appears, click Export →
        Markdown. Choose between plain or with timestamps depending on your use case. The file
        downloads immediately.
      </p>

      <p>
        <strong>Step 3: Move to your vault.</strong> Drag the <code>.md</code> file into your
        Obsidian vault folder — a <code>Clippings/Videos/</code> folder works well for keeping video
        notes organized.
      </p>

      <p>
        <strong>Step 4: Query with Dataview.</strong> All YAML frontmatter fields are immediately
        queryable (
        <a
          href="https://blacksmithgu.github.io/obsidian-dataview"
          target="_blank"
          rel="noopener noreferrer"
        >
          Dataview docs
        </a>
        ). A basic query to list all your video notes sorted by date:
      </p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC`}</code></pre>

      <p>To find all videos from a specific channel:</p>

      <pre className="prose-content-pre"><code>{`LIST
FROM "Clippings/Videos"
WHERE channel = "Tiago Forte"`}</code></pre>

      <p>To filter by duration (videos over 30 minutes):</p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE duration > 1800
SORT duration DESC`}</code></pre>

      <h2>The Notion Workflow</h2>

      <p>
        Notion handles Markdown import reasonably well for transcript content, with one important
        caveat: YAML frontmatter is not automatically mapped to database properties.
      </p>

      <p>
        <strong>Method 1: Import as a page.</strong> In Notion, go to Settings → Import → Text &amp;
        Markdown, then upload the <code>.md</code> file. Notion creates a new page with the
        transcript body formatted correctly. The YAML block appears as a code block at the top — you
        can delete it and manually fill in the database properties if you&apos;re using a video database.
      </p>

      <p>
        <strong>Method 2: Copy-paste.</strong> For short transcripts, open the file in any text
        editor, select all, copy, and paste directly into a Notion page. Notion renders the Markdown
        formatting inline. This is the fastest method for one-off videos.
      </p>

      <p>
        <strong>Method 3: Notion API.</strong> If you&apos;re building an automated pipeline, use
        Notion&apos;s API with the <code>markdown</code> parameter (available as of Notion-Version
        2026-03-11). Send a <code>POST /v1/pages</code> request with the Markdown content and page
        properties in the same call — no need to separately create a page and then add content.
      </p>

      <p>
        For a video database in Notion, the recommended properties to set up are: Title, Source URL,
        Channel (Text or Select), Published Date, Status (Inbox/Watched/Processed), Tags, and
        Duration. These map directly to the YAML fields in INDXR.AI&apos;s export.
      </p>

      <h2>For Blog Posts and Newsletters</h2>

      <p>
        The plain Markdown export (no timestamps) is the cleanest starting point for repurposing
        video content. The export strips HTML entities, removes markup artifacts, and outputs clean
        prose that you can paste directly into a blog editor.
      </p>

      <p>
        A common workflow: extract transcript → export as plain Markdown → paste into Claude or
        ChatGPT with the prompt &quot;Rewrite this transcript as a blog post, keeping the main arguments
        and removing filler.&quot; The result is a rough draft in under a minute.
      </p>

      <p>
        For Substack, Ghost, or WordPress: all three accept Markdown input natively. Ghost uses
        Markdown as its primary editor format. Substack&apos;s web editor accepts pasted Markdown with
        formatting intact. WordPress with a Markdown plugin handles <code>.md</code> file imports
        directly.
      </p>

      <h2>When to Use Which Export Format</h2>

      <p>Not every workflow needs Markdown. Here&apos;s when each format makes sense:</p>

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
          <tr><td>AI summarization / ChatGPT input</td><td>TXT plain or Markdown plain</td></tr>
          <tr><td>Video editing / subtitle sync</td><td>SRT or VTT</td></tr>
          <tr><td>Data analysis / research</td><td>CSV</td></tr>
          <tr><td>RAG pipeline / vector database</td><td>JSON RAG-optimized</td></tr>
          <tr><td>Developer integration</td><td>JSON</td></tr>
        </tbody>
      </table>

      <p>
        For more on the Obsidian-specific workflow, see{" "}
        <Link href="/youtube-transcript-obsidian">YouTube Transcript to Obsidian</Link>. For pricing
        and credit usage, see the <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
