# YouTube Transcript to Markdown — Export Ready for Obsidian, Notion & Your Blog

**Meta title:** YouTube Transcript to Markdown — Obsidian, Notion & Blog Ready | INDXR.AI
**Meta description:** Export YouTube transcripts as clean Markdown with YAML frontmatter. Dataview-compatible properties, works when Obsidian plugins break. No extension required.
**Slug:** /youtube-transcript-markdown
**Schema:** SoftwareApplication + HowTo + FAQPage
**Internal links:** /youtube-transcript-obsidian, /how-it-works, /pricing, /youtube-transcript-not-available
**Word count:** ~1700 words

---

Getting a YouTube transcript into Obsidian or Notion sounds simple until you try it. The Obsidian Web Clipper's transcript selector has broken twice in early 2026 due to YouTube UI changes. The YTranscript plugin requires a specific URL format and generates no YAML frontmatter. Most other solutions are Chrome extensions that stop working the moment YouTube updates its DOM.

INDXR.AI exports YouTube transcripts directly as Markdown — with YAML frontmatter included, from a server-side pipeline that doesn't depend on browser extensions or fragile CSS selectors. It works for videos without captions too, using AI transcription as a fallback.

---

## What the Markdown Export Contains

Every Markdown export from INDXR.AI includes a YAML frontmatter block at the top, followed by the transcript body. The frontmatter fields are chosen specifically for Obsidian Dataview compatibility and Notion property mapping.

A standard export looks like this:

```markdown
---
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

[00:02:15] The first principle is that your brain is for having ideas, not storing them...
```

The `source` field uses the full canonical YouTube URL — directly linkable. `duration` is stored in seconds as a number so Dataview can sort and filter by length. `type: youtube` lets you distinguish video notes from other content types in your vault. The `created` timestamp records when you extracted the transcript, not when the video was published — add a `published` field manually if you need the upload date.

Two variants are available: plain Markdown (one continuous block, ideal for pasting into blog posts or feeding to AI tools) and Markdown with timestamps (each line prefixed with `[HH:MM:SS]`, ideal for Obsidian notes where you want to reference specific moments).

---

## Why Existing Obsidian Plugins Break

The core problem is that every plugin-based approach scrapes YouTube's frontend, and YouTube changes that frontend frequently.

The Obsidian Web Clipper uses a CSS selector targeting the transcript panel DOM element. When YouTube updated its UI in February 2026, the `target-id` attribute changed, breaking every existing template. The community scrambled to update selectors — and then it broke again weeks later (Obsidian Forum, thread 111550). The transcript panel also has to be manually opened before clipping, or the selector returns nothing.

The YTranscript plugin (obsidian-yt-transcript, 174 GitHub stars) uses YouTube's InnerTube API directly rather than DOM scraping, which makes it more stable. But it requires full `youtube.com/watch?v=` URLs — short `youtu.be` links and URLs with tracking parameters (`?si=`) cause Status 400 errors. It also inserts transcript text as a flat block with no YAML frontmatter, so you get raw text in your note but none of the structured metadata Dataview needs.

INDXR.AI runs server-side via yt-dlp and residential proxies, bypassing browser-level restrictions entirely. It doesn't break when YouTube updates its UI. It also handles videos without captions through AssemblyAI's speech recognition — something no browser plugin can do.

---

## The Obsidian Workflow

Getting a YouTube transcript into your Obsidian vault with INDXR.AI takes four steps.

**Step 1: Extract the transcript.** Paste the YouTube URL into INDXR.AI. If the video has auto-captions, extraction is free and takes a few seconds. If it doesn't, enable AI Transcription (1 credit per minute) and confirm.

**Step 2: Export as Markdown.** Once the transcript appears, click Export → Markdown. Choose between plain or with timestamps depending on your use case. The file downloads immediately.

**Step 3: Move to your vault.** Drag the `.md` file into your Obsidian vault folder — a `Clippings/Videos/` folder works well for keeping video notes organized.

**Step 4: Query with Dataview.** All YAML frontmatter fields are immediately queryable. A basic query to list all your video notes sorted by date:

```dataview
TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC
```

To find all videos from a specific channel:

```dataview
LIST
FROM "Clippings/Videos"
WHERE channel = "Tiago Forte"
```

To filter by duration (videos over 30 minutes):

```dataview
TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE duration > 1800
SORT duration DESC
```

Dataview reads all YAML frontmatter fields automatically — no configuration required (Dataview docs, blacksmithgu.github.io/obsidian-dataview).

---

## The Notion Workflow

Notion handles Markdown import reasonably well for transcript content, with one important caveat: YAML frontmatter is not automatically mapped to database properties.

**Method 1: Import as a page.** In Notion, go to Settings → Import → Text & Markdown, then upload the `.md` file. Notion creates a new page with the transcript body formatted correctly. Headers, paragraphs, and timestamp lines all render cleanly. The YAML block appears as a code block at the top — you can delete it and manually fill in the database properties if you're using a video database.

**Method 2: Copy-paste.** For short transcripts, open the file in any text editor, select all, copy, and paste directly into a Notion page. Notion renders the Markdown formatting inline. This is the fastest method for one-off videos.

**Method 3: Notion API.** If you're building an automated pipeline, use Notion's API with the `markdown` parameter (available as of Notion-Version 2026-03-11). Send a `POST /v1/pages` request with the Markdown content and page properties in the same call — no need to separately create a page and then add content.

For a video database in Notion, the recommended properties to set up are: Title, Source URL, Channel (Text or Select), Published Date, Status (Inbox/Watched/Processed), Tags, and Duration. These map directly to the YAML fields in INDXR.AI's export.

---

## For Blog Posts and Newsletters

The plain Markdown export (no timestamps) is the cleanest starting point for repurposing video content. The export strips HTML entities, removes markup artifacts, and outputs clean prose that you can paste directly into a blog editor.

A common workflow: extract transcript → export as plain Markdown → paste into Claude or ChatGPT with the prompt "Rewrite this transcript as a blog post, keeping the main arguments and removing filler." The result is a rough draft in under a minute.

For Substack, Ghost, or WordPress: all three accept Markdown input natively. Ghost uses Markdown as its primary editor format. Substack's web editor accepts pasted Markdown with formatting intact. WordPress with a Markdown plugin (Jetpack or WP Githuber MD) handles `.md` file imports directly.

---

## When to Use Which Export Format

Not every workflow needs Markdown. Here's when each format makes sense:

| Use case | Recommended format |
|---|---|
| Obsidian vault with Dataview | Markdown with timestamps |
| Notion video database | Markdown (plain or timestamps) |
| Blog/newsletter repurposing | Markdown plain |
| AI summarization / ChatGPT input | TXT plain or Markdown plain |
| Video editing / subtitle sync | SRT or VTT |
| Data analysis / research | CSV |
| RAG pipeline / vector database | JSON RAG-optimized |
| Developer integration | JSON |

---

## Frequently Asked Questions

**Does the Markdown export work for videos without auto-captions?**
Yes. Enable AI Transcription before extracting — INDXR.AI uses AssemblyAI Universal-3 Pro to transcribe the audio. The resulting Markdown is higher quality than auto-caption exports because AssemblyAI adds proper punctuation and sentence boundaries. Cost: 1 credit per minute of video.

**What's the difference between Markdown plain and Markdown with timestamps?**
Plain Markdown outputs the transcript as continuous paragraphs with no time references — ideal for blog posts, summaries, and AI input. Markdown with timestamps adds `[HH:MM:SS]` at the start of each segment, with each timestamp on its own line — ideal for Obsidian notes where you want to jump to specific moments in the video.

**Is the YAML frontmatter compatible with Obsidian Properties (the new GUI panel)?**
Yes. Obsidian's Properties panel reads standard YAML frontmatter. All fields from INDXR.AI's export will appear in the Properties panel automatically. The `duration` field (stored as a number in seconds) will appear as a number property.

**Can I customize the YAML frontmatter fields?**
Not currently via the export UI — INDXR.AI exports a standardized template. You can add fields manually after importing, or use Obsidian's Templater plugin to apply a post-processing template. Customizable frontmatter is on the roadmap.

**Why doesn't Obsidian Web Clipper work reliably for YouTube transcripts?**
The Web Clipper extracts transcripts by targeting specific HTML elements in YouTube's page DOM. YouTube updates its frontend without notice, which changes or removes these elements. INDXR.AI retrieves transcripts server-side via YouTube's internal API, which is not affected by frontend UI changes.

**Do I need a browser extension to use INDXR.AI?**
No. INDXR.AI is a web tool — paste a YouTube URL, get a transcript, download the Markdown. No extension, no installation, no account required for a single free extraction. Markdown export requires a free account.

---

*Extract any YouTube video as Markdown in seconds — [try INDXR.AI free](/youtube-transcript-generator). Works with or without an account for auto-caption videos.*
