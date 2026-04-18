import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript to Obsidian — Works When Plugins Break | INDXR.AI",
  description:
    "Obsidian plugins for YouTube transcripts break when YouTube updates its UI. INDXR.AI exports clean Markdown with YAML frontmatter and Dataview-compatible properties — reliable, no plugin required.",
}

const faqs = [
  {
    q: "Does the YAML frontmatter work with Obsidian Properties (the GUI panel)?",
    a: "Yes. Obsidian's Properties panel reads standard YAML frontmatter directly. All fields from INDXR.AI's export appear in the Properties panel automatically. The duration field appears as a number property; created as a date property; tags as a multi-value text property.",
  },
  {
    q: "Can I customize the frontmatter fields INDXR.AI exports?",
    a: "Not currently via the export UI — the template is standardized. You can add fields manually after importing, or use Obsidian's Templater plugin to post-process the note and add custom properties. Custom frontmatter templates are on the product roadmap.",
  },
  {
    q: "Why does the Obsidian Web Clipper stop working for YouTube?",
    a: "The Web Clipper extracts transcripts by targeting specific HTML elements in YouTube's page. YouTube updates its frontend periodically, changing or removing those elements. The transcript panel also has to be manually opened before clipping, or the selector returns empty. INDXR.AI retrieves transcripts server-side via YouTube's internal API, which is not affected by frontend UI changes.",
  },
  {
    q: "Does this work for YouTube videos without auto-captions?",
    a: "Yes. Enable AI Transcription in INDXR.AI before extracting. The resulting Markdown is higher quality than auto-caption exports — proper punctuation means transcript text reads naturally in your notes. Cost: 1 credit per minute of video.",
  },
  {
    q: 'What folder structure do you recommend for video notes in Obsidian?',
    a: 'A simple approach that scales: Clippings/Videos/ for all video transcripts. If you process many videos, add subfolders by channel or topic — Clippings/Videos/Harvard/, Clippings/Videos/Research/. Dataview can query across all of these with a simple FROM "Clippings/Videos" clause.',
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
  {
    label: "youtube-transcript-api — PyPI",
    url: "https://pypi.org/project/youtube-transcript-api",
  },
]

export default function YouTubeTranscriptObsidianPage() {
  return (
    <ToolPageTemplate
      title="Import YouTube Transcripts into Obsidian — A Reliable Workflow for 2026"
      metaDescription="Obsidian plugins for YouTube transcripts break when YouTube updates its UI. INDXR.AI exports clean Markdown with YAML frontmatter and Dataview-compatible properties — reliable, no plugin required."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["sarah-lindqvist"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Every Obsidian user who has built a YouTube transcript workflow has hit the same problem at
        some point: the plugin stopped working. The Obsidian Web Clipper&apos;s transcript selector broke
        twice in early 2026 when YouTube updated its interface (
        <a href="https://forum.obsidian.md/t/111550" target="_blank" rel="noopener noreferrer">
          Obsidian Forum, thread 111550
        </a>
        ). The YTranscript plugin requires exact URL formats and generates no frontmatter. Most
        browser-based solutions depend on reading YouTube&apos;s page HTML — which changes without
        warning.
      </p>

      <p>
        INDXR.AI extracts transcripts server-side and exports them as Markdown files with YAML
        frontmatter ready for your vault. The workflow is slightly longer than a one-click
        extension, but it works consistently regardless of what YouTube does to its frontend.
      </p>

      <h2>What the Markdown Export Looks Like in Your Vault</h2>

      <p>
        Every INDXR.AI Markdown export includes a YAML frontmatter block with fields chosen for
        Obsidian compatibility:
      </p>

      <pre className="prose-content-pre"><code>{`---
title: "Justice: What's the Right Thing to Do? — Episode 1"
source: "https://www.youtube.com/watch?v=kBdfcR-8hEY"
channel: "Harvard University"
duration: 3421
language: "en"
type: youtube
created: "2026-04-16T10:15:00Z"
tags: [youtube, transcript, philosophy, justice]
---

## Transcript

[00:00:00] Suppose the brakes on your trolley fail...

[00:02:14] This is the question we'll be examining throughout this course...`}</code></pre>

      <p>
        The <code>duration</code> field is stored in seconds as a number — queryable, sortable,
        filterable. The <code>type: youtube</code> field lets you distinguish video notes from
        articles, books, or other content types in your vault. The <code>source</code> field is a
        direct link to the video — paste it into Obsidian and it opens in your browser.
      </p>

      <p>
        Both plain Markdown (continuous text, ideal for reading and AI input) and Markdown with
        timestamps (each segment prefixed with <code>[HH:MM:SS]</code>) are available. For Obsidian
        notes, the timestamps variant is usually more useful — you can jump to the exact moment in
        the video when reviewing your notes.
      </p>

      <h2>Dataview Queries That Work Immediately</h2>

      <p>
        All YAML frontmatter fields are automatically indexed by{" "}
        <a
          href="https://blacksmithgu.github.io/obsidian-dataview"
          target="_blank"
          rel="noopener noreferrer"
        >
          Dataview
        </a>
        . No configuration required — drop the file into your vault and every field is queryable.
      </p>

      <p><strong>List all video notes sorted by date:</strong></p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC`}</code></pre>

      <p><strong>Find all videos from a specific channel:</strong></p>

      <pre className="prose-content-pre"><code>{`LIST
FROM "Clippings/Videos"
WHERE channel = "Harvard University"`}</code></pre>

      <p><strong>Filter by length — videos over 45 minutes:</strong></p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE duration > 2700
SORT duration DESC`}</code></pre>

      <p><strong>Unprocessed videos — recently imported, not yet tagged:</strong></p>

      <pre className="prose-content-pre"><code>{`TABLE title, created
FROM "Clippings/Videos"
WHERE type = "youtube" AND !contains(tags, "processed")
SORT created DESC`}</code></pre>

      <h2>The Step-by-Step Workflow</h2>

      <p>
        <strong>Step 1: Extract the transcript.</strong> Paste the YouTube URL into INDXR.AI. For
        videos with auto-captions, extraction is free and takes seconds. For videos without
        captions, enable AI Transcription (1 credit per minute) — the resulting transcript has
        proper punctuation, which matters for readability in your vault.
      </p>

      <p>
        <strong>Step 2: Export as Markdown.</strong> Click Export and choose &quot;Markdown — With
        Timestamps&quot; for notes you&apos;ll actively review, or &quot;Markdown — Plain&quot; for videos
        you&apos;ll process into summaries or feed to AI tools. The <code>.md</code> file downloads
        immediately.
      </p>

      <p>
        <strong>Step 3: Move to your vault.</strong> Drag the file into your Obsidian vault folder.
        A dedicated folder like <code>Clippings/Videos/</code> or <code>Resources/YouTube/</code>{" "}
        keeps video notes organized separately from your own writing.
      </p>

      <p>
        <strong>Step 4: Open in Obsidian.</strong> The note opens with the YAML frontmatter visible
        in the Properties panel (Obsidian 1.0+) or as raw YAML in source mode. Add your own tags,
        link to related notes, start writing in the body below the transcript.
      </p>

      <p>
        <strong>Optional — generate an AI summary first.</strong> Before exporting, you can use
        INDXR.AI&apos;s AI Summary feature (3 credits) to get a summary and action points. Export both
        the summary and the full transcript as separate Markdown files, or include both in the same
        note.
      </p>

      <h2>Why the Plugin Approach Keeps Failing</h2>

      <p>
        Understanding why extensions and plugins break helps clarify why a server-side approach is
        more reliable long-term.
      </p>

      <p>
        <strong>DOM-based tools break when YouTube redesigns its UI.</strong> The Web Clipper uses
        selectors like <code>.segment-text</code> inside specific panel elements. YouTube changed
        how its transcript panel renders in February 2026, breaking these selectors. The community
        published workaround templates — and then YouTube changed the structure again. This is not a
        one-time event; it&apos;s a recurring pattern.
      </p>

      <p>
        <strong>API-based tools get blocked in cloud environments.</strong> The{" "}
        <code>youtube-transcript-api</code> Python library (the backend for several tools) is
        blocked when called from cloud server IP ranges — AWS, GCP, Railway, Vercel. YouTube
        actively rate-limits these requests. The library&apos;s GitHub README includes a dedicated
        section on working around IP bans (
        <a
          href="https://pypi.org/project/youtube-transcript-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          PyPI
        </a>
        ).
      </p>

      <p>
        INDXR.AI uses yt-dlp through residential proxy infrastructure. yt-dlp communicates with
        YouTube&apos;s internal endpoints rather than scraping visible HTML, and the residential proxy
        avoids IP-range blocking. This combination is what makes it reliable across YouTube&apos;s
        periodic updates.
      </p>

      <h2>For Playlist and Course Notes</h2>

      <p>
        INDXR.AI&apos;s playlist extraction lets you process an entire course — 19 videos, 13 hours, 783
        minutes — as a single job, with all transcripts exported as individual Markdown files in one
        ZIP download. Drop the entire ZIP into your Obsidian vault and every lecture becomes a
        structured, queryable note with proper frontmatter.
      </p>

      <p>
        For a course like Harvard&apos;s Justice series, the Dataview query to list all lectures in
        order writes itself:
      </p>

      <pre className="prose-content-pre"><code>{`TABLE title, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE channel = "Harvard University"
SORT created ASC`}</code></pre>

      <p>
        For more detail on the Markdown export format, see{" "}
        <Link href="/youtube-transcript-markdown">YouTube Transcript to Markdown</Link>. For
        troubleshooting videos without captions, see{" "}
        <Link href="/youtube-transcript-not-available">YouTube Transcript Not Available</Link>. For
        credit costs and package options, see the <Link href="/pricing">pricing page</Link>, or{" "}
        <Link href="/how-it-works">how INDXR.AI works</Link> for a full pipeline overview.
      </p>
    </ToolPageTemplate>
  )
}
