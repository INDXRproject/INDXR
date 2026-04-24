import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcript to Obsidian — Works When Plugins Break | INDXR.AI",
  description:
    "YTranscript and Obsidian Web Clipper break when YouTube updates its UI. INDXR.AI exports transcripts as Markdown with YAML frontmatter, Dataview-compatible properties, and clickable timestamp links — server-side, no plugin required.",
}

const faqs = [
  {
    q: "Does the YAML frontmatter work with Obsidian Properties?",
    a: "Yes. Obsidian's Properties panel reads standard YAML frontmatter. duration appears as a number; created as a date; tags as a multi-select; url as a text field you can click. All fields appear automatically when you open the note.",
  },
  {
    q: "Why don't channel and language appear in some exports?",
    a: "Those fields come from YouTube's video metadata, available during caption extraction. AI Transcription and audio uploads don't have that metadata, so the fields are omitted. The transcript_source field tells you which method was used.",
  },
  {
    q: "Can I customize the frontmatter?",
    a: "Not via the export UI — the template is standardized. You can add fields manually after importing, or use Obsidian's Templater plugin to post-process notes with custom properties.",
  },
  {
    q: "Does this work for videos without captions?",
    a: "Yes. Enable AI Transcription before extracting. AssemblyAI Universal-3 Pro produces properly punctuated, capitalized text — significantly more readable than auto-captions in your notes. Cost: 1 credit per minute.",
  },
  {
    q: "What folder structure works best?",
    a: "Clippings/Videos/ for all video transcripts is a simple starting point that scales. Add subfolders by channel or topic as you accumulate more: Clippings/Videos/Huberman/, Clippings/Videos/Research/. Dataview queries across all subfolders with FROM \"Clippings/Videos\".",
  },
  {
    q: "Is this faster than the Web Clipper when it works?",
    a: "The Web Clipper is one click when it works. INDXR.AI requires pasting a URL, waiting a few seconds for extraction, clicking Export, and dragging a file into your vault — four steps instead of one. The trade-off is reliability. If you've spent time debugging broken templates already, the extra step becomes acceptable quickly.",
  },
]

const sources = [
  {
    label: "Obsidian Dataview — Documentation",
    url: "https://blacksmithgu.github.io/obsidian-dataview/",
  },
  {
    label: "Obsidian Forum — YouTube transcript plugin discussion (thread 111550)",
    url: "https://forum.obsidian.md/t/111550",
  },
  {
    label: "youtube-transcript-api — PyPI (includes section on IP blocking)",
    url: "https://pypi.org/project/youtube-transcript-api/",
  },
  {
    label: "yt-dlp — GitHub",
    url: "https://github.com/yt-dlp/yt-dlp",
  },
  {
    label: "Obsidian Templater plugin — GitHub",
    url: "https://github.com/SilentVoid13/Templater",
  },
]

export default function YouTubeTranscriptObsidianPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcript to Obsidian — Works When Plugins Break"
      metaDescription="YTranscript and Obsidian Web Clipper break when YouTube updates its UI. INDXR.AI exports transcripts as Markdown with YAML frontmatter, Dataview-compatible properties, and clickable timestamp links — server-side, no plugin required."
      publishedAt="2026-04-16"
      updatedAt="2026-04-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Every Obsidian user who has built a YouTube transcript workflow has hit the same wall at
        some point: the plugin stopped working. The Obsidian Web Clipper&apos;s transcript selector
        broke twice in early 2026 when YouTube updated its interface. The YTranscript plugin is
        more stable but rejects short youtu.be links and URLs with tracking parameters, outputs raw
        text with no frontmatter, and can&apos;t handle videos without captions at all.
      </p>

      <p>
        The underlying problem is structural: every plugin-based approach depends on reading
        YouTube&apos;s page in your browser, and YouTube changes that page without warning. INDXR.AI
        extracts transcripts server-side and exports them as .md files with YAML frontmatter ready
        for your vault. The workflow has one extra step compared to a browser extension — paste the
        URL, download the file, drop it in your vault — but it doesn&apos;t break.
      </p>

      <h2>What the Note Looks Like</h2>

      <p>
        Here&apos;s a real export from Harvard University&apos;s Justice lecture series — a video with
        auto-captions:
      </p>

      <pre className="prose-content-pre"><code>{`---
title: "Justice: What's the Right Thing to Do? — Episode 1"
url: "https://www.youtube.com/watch?v=kBdfcR-8hEY"
channel: "Harvard University"
published: "2009-09-04"
duration: 3421
language: "en"
transcript_source: "Auto-captions (YouTube)"
created: "2026-04-24"
type: youtube
tags: [youtube, transcript]
---

# Justice: What's the Right Thing to Do? — Episode 1

## [00:00:00](https://youtu.be/kBdfcR-8hEY?t=0)
Suppose the brakes on your trolley fail and the trolley is
hurtling down the track toward five workers...

## [00:02:14](https://youtu.be/kBdfcR-8hEY?t=134)
This is the question we'll be examining throughout this course.
What's the right thing to do?`}</code></pre>

      <p>
        Each <code>## [HH:MM:SS]</code> header is a real clickable link. In Obsidian, clicking it
        opens that exact moment in the video in your browser. The YAML frontmatter appears in
        Obsidian&apos;s Properties panel automatically — no configuration needed.
      </p>

      <p>
        One important thing to know: <code>channel</code>, <code>published</code>, and{" "}
        <code>language</code> are only included when extracting via YouTube captions, because those
        fields come from YouTube&apos;s video metadata. If you use AI Transcription on a video without
        captions, or transcribe an audio file, those fields won&apos;t appear. The{" "}
        <code>transcript_source</code> field tells you which method was used.
      </p>

      <h2>Dataview Queries That Work Immediately</h2>

      <p>
        All frontmatter fields are automatically indexed by{" "}
        <a
          href="https://blacksmithgu.github.io/obsidian-dataview/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Dataview
        </a>{" "}
        — drop the file in your vault and every field is queryable without any setup.
      </p>

      <p>List all video notes, most recent first:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC`}</code></pre>

      <p>All lectures from a specific channel, in order:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, url, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE channel = "Harvard University"
SORT created ASC`}</code></pre>

      <p>Long videos not yet processed:</p>

      <pre className="prose-content-pre"><code>{`TABLE title, channel, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE type = "youtube" AND duration > 2700 AND !contains(tags, "processed")
SORT created DESC`}</code></pre>

      <p>
        The <code>duration</code> field is stored in seconds as a number, so{" "}
        <code>round(duration / 60)</code> gives you minutes. The <code>url</code> field is the full
        YouTube URL — link it in Obsidian and it opens in your browser.
      </p>

      <h2>The Workflow</h2>

      <p>
        <strong>Step 1 — Extract.</strong> Paste the YouTube URL into INDXR.AI. For videos with
        auto-captions, extraction is free. For videos without captions, enable AI Transcription (1
        credit per minute) — the resulting transcript has proper punctuation, which makes notes
        significantly more readable.
      </p>

      <p>
        <strong>Step 2 — Export.</strong> Click Export → Markdown → With Timestamps. The .md file
        downloads immediately.
      </p>

      <p>
        <strong>Step 3 — Move to your vault.</strong> Drag the file into{" "}
        <code>Clippings/Videos/</code> or wherever you keep reference material. Obsidian indexes
        the frontmatter immediately.
      </p>

      <p>
        <strong>Step 4 — Navigate.</strong> Open the note. Click any{" "}
        <code>## [HH:MM:SS]</code> timestamp to jump to that moment in the video. Use Dataview to
        query across all your video notes.
      </p>

      <p>
        <strong>Optional:</strong> before exporting, use INDXR.AI&apos;s AI Summary (3 credits) to
        generate a summary and key points. Export the summary and the full transcript as separate
        files, or paste the summary at the top of the note as your own writing.
      </p>

      <h2>Why Plugins Keep Breaking</h2>

      <p>The failure pattern is the same across all browser-based tools.</p>

      <p>
        <strong>DOM-based tools fail when YouTube redesigns its UI.</strong> The Obsidian Web
        Clipper uses CSS selectors to target the transcript panel — selectors like{" "}
        <code>.segment-text</code> inside specific container elements. YouTube updated how its
        transcript panel renders in February 2026, breaking every existing template. The Obsidian
        community published fixes, then YouTube changed the structure again a few weeks later (
        <a
          href="https://forum.obsidian.md/t/111550"
          target="_blank"
          rel="noopener noreferrer"
        >
          Obsidian Forum thread 111550
        </a>
        ). This is not a one-time event. YouTube has no obligation to maintain a stable frontend for
        third-party scrapers.
      </p>

      <p>
        <strong>API-based tools get blocked in cloud environments.</strong> The{" "}
        <code>youtube-transcript-api</code> Python library — the backend for several extraction
        tools — is actively blocked when called from cloud server IP ranges (AWS, GCP, Railway,
        Vercel). YouTube rate-limits these requests and returns authentication errors. The library&apos;s{" "}
        <a
          href="https://pypi.org/project/youtube-transcript-api/"
          target="_blank"
          rel="noopener noreferrer"
        >
          PyPI README
        </a>{" "}
        includes a dedicated section on working around IP bans.
      </p>

      <p>
        INDXR.AI uses{" "}
        <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer">
          yt-dlp
        </a>{" "}
        through residential proxy infrastructure. yt-dlp communicates with YouTube&apos;s internal API
        endpoints rather than scraping visible HTML, and residential proxies avoid IP-range
        blocking. This is why it continues to work when other tools don&apos;t.
      </p>

      <h2>For Courses and Playlists</h2>

      <p>
        INDXR.AI processes entire playlists as a single job. A full course — 19 lectures, 13 hours
        — downloads as a ZIP of individual .md files, each with its own frontmatter. Drop the ZIP
        into your vault and every lecture is a structured, queryable note.
      </p>

      <p>
        For a course like Harvard&apos;s Justice series, the Dataview query to list all lectures in
        order writes itself:
      </p>

      <pre className="prose-content-pre"><code>{`TABLE title, url, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE channel = "Harvard University"
SORT created ASC`}</code></pre>

      <p>
        For more detail on the Markdown export format and YAML frontmatter schema, see{" "}
        <Link href="/youtube-transcript-markdown">YouTube Transcript to Markdown</Link>. For credit
        costs and package options, see the <Link href="/pricing">pricing page</Link>.{" "}
        <Link href="/youtube-transcript-generator">
          Export a YouTube transcript for Obsidian
        </Link>{" "}
        — free for captioned videos, Markdown with YAML frontmatter and clickable timestamps
        included.
      </p>
    </ToolPageTemplate>
  )
}
