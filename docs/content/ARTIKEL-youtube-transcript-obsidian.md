# Import YouTube Transcripts into Obsidian — A Reliable Workflow for 2026

**Meta title:** YouTube Transcript to Obsidian — Works When Plugins Break | INDXR.AI
**Meta description:** Obsidian plugins for YouTube transcripts break when YouTube updates its UI. INDXR.AI exports clean Markdown with YAML frontmatter and Dataview-compatible properties — reliable, no plugin required.
**Slug:** /youtube-transcript-obsidian
**Schema:** HowTo + FAQPage
**Internal links:** /youtube-transcript-markdown, /youtube-transcript-generator, /pricing, /youtube-transcript-not-available
**Word count:** ~1300 words

---

Every Obsidian user who has built a YouTube transcript workflow has hit the same problem at some point: the plugin stopped working. The Obsidian Web Clipper's transcript selector broke twice in early 2026 when YouTube updated its interface (Obsidian Forum, forum.obsidian.md/t/111550). The YTranscript plugin requires exact URL formats and generates no frontmatter. Most browser-based solutions depend on reading YouTube's page HTML — which changes without warning.

INDXR.AI extracts transcripts server-side and exports them as Markdown files with YAML frontmatter ready for your vault. The workflow is slightly longer than a one-click extension, but it works consistently regardless of what YouTube does to its frontend.

---

## What the Markdown Export Looks Like in Your Vault

Every INDXR.AI Markdown export includes a YAML frontmatter block with fields chosen for Obsidian compatibility:

```markdown
---
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

[00:02:14] This is the question we'll be examining throughout this course...
```

The `duration` field is stored in seconds as a number — queryable, sortable, filterable. The `type: youtube` field lets you distinguish video notes from articles, books, or other content types in your vault. The `source` field is a direct link to the video — paste it into Obsidian and it opens in your browser.

Both plain Markdown (continuous text, ideal for reading and AI input) and Markdown with timestamps (each segment prefixed with `[HH:MM:SS]`) are available. For Obsidian notes, the timestamps variant is usually more useful — you can jump to the exact moment in the video when reviewing your notes.

---

## Dataview Queries That Work Immediately

All YAML frontmatter fields are automatically indexed by Dataview (Dataview docs, blacksmithgu.github.io/obsidian-dataview). No configuration required — drop the file into your vault and every field is queryable.

**List all video notes sorted by date:**
```dataview
TABLE title, channel, duration
FROM "Clippings/Videos"
WHERE type = "youtube"
SORT created DESC
```

**Find all videos from a specific channel:**
```dataview
LIST
FROM "Clippings/Videos"
WHERE channel = "Harvard University"
```

**Filter by length — videos over 45 minutes:**
```dataview
TABLE title, channel, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE duration > 2700
SORT duration DESC
```

**Unprocessed videos — recently imported, not yet tagged:**
```dataview
TABLE title, created
FROM "Clippings/Videos"
WHERE type = "youtube" AND !contains(tags, "processed")
SORT created DESC
```

---

## The Step-by-Step Workflow

**Step 1: Extract the transcript.** Paste the YouTube URL into INDXR.AI. For videos with auto-captions, extraction is free and takes seconds. For videos without captions, enable AI Transcription (1 credit per minute) — the resulting transcript has proper punctuation, which matters for readability in your vault.

**Step 2: Export as Markdown.** Click Export and choose "Markdown — With Timestamps" for notes you'll actively review, or "Markdown — Plain" for videos you'll process into summaries or feed to AI tools. The `.md` file downloads immediately.

**Step 3: Move to your vault.** Drag the file into your Obsidian vault folder. A dedicated folder like `Clippings/Videos/` or `Resources/YouTube/` keeps video notes organized separately from your own writing.

**Step 4: Open in Obsidian.** The note opens with the YAML frontmatter visible in the Properties panel (Obsidian 1.0+) or as raw YAML in source mode. Add your own tags, link to related notes, start writing in the body below the transcript.

**Optional — generate an AI summary first.** Before exporting, you can use INDXR.AI's AI Summary feature (3 credits) to get a summary and action points. Export both the summary and the full transcript as separate Markdown files, or include both in the same note.

---

## Why the Plugin Approach Keeps Failing

Understanding why extensions and plugins break helps clarify why a server-side approach is more reliable long-term.

Obsidian plugins that extract YouTube transcripts — YTranscript, Web Clipper YouTube templates, various community scripts — work by either reading YouTube's page DOM (HTML elements on the page) or calling YouTube's transcript API without authentication. Both approaches have the same vulnerability:

**DOM-based tools break when YouTube redesigns its UI.** The Web Clipper uses selectors like `.segment-text` inside specific panel elements. YouTube changed how its transcript panel renders in February 2026, breaking these selectors. The community published workaround templates — and then YouTube changed the structure again. This is not a one-time event; it's a recurring pattern.

**API-based tools get blocked in cloud environments.** The `youtube-transcript-api` Python library (the backend for several tools) is blocked when called from cloud server IP ranges — AWS, GCP, Railway, Vercel. YouTube actively rate-limits these requests. The library's GitHub README includes a dedicated section on working around IP bans, reflecting how common the problem is (PyPI, pypi.org/project/youtube-transcript-api).

INDXR.AI uses yt-dlp through residential proxy infrastructure. yt-dlp communicates with YouTube's internal endpoints rather than scraping visible HTML, and the residential proxy avoids IP-range blocking. This combination is what makes it reliable across YouTube's periodic updates.

---

## For Playlist and Course Notes

INDXR.AI's playlist extraction lets you process an entire course — 19 videos, 13 hours, 783 minutes — as a single job, with all transcripts exported as individual Markdown files in one ZIP download. Drop the entire ZIP into your Obsidian vault and every lecture becomes a structured, queryable note with proper frontmatter.

For a course like Harvard's Justice series, the Dataview query to list all lectures in order writes itself:

```dataview
TABLE title, round(duration / 60) AS "Minutes"
FROM "Clippings/Videos"
WHERE channel = "Harvard University"
SORT created ASC
```

---

## Frequently Asked Questions

**Does the YAML frontmatter work with Obsidian Properties (the GUI panel)?**
Yes. Obsidian's Properties panel reads standard YAML frontmatter directly. All fields from INDXR.AI's export appear in the Properties panel automatically. The `duration` field appears as a number property; `created` as a date property; `tags` as a multi-value text property.

**Can I customize the frontmatter fields INDXR.AI exports?**
Not currently via the export UI — the template is standardized. You can add fields manually after importing, or use Obsidian's Templater plugin to post-process the note and add custom properties. Custom frontmatter templates are on the product roadmap.

**Why does the Obsidian Web Clipper stop working for YouTube?**
The Web Clipper extracts transcripts by targeting specific HTML elements in YouTube's page. YouTube updates its frontend periodically, changing or removing those elements. The transcript panel also has to be manually opened before clipping, or the selector returns empty. INDXR.AI retrieves transcripts server-side via YouTube's internal API, which is not affected by frontend UI changes.

**Does this work for YouTube videos without auto-captions?**
Yes. Enable AI Transcription in INDXR.AI before extracting. The resulting Markdown is higher quality than auto-caption exports — proper punctuation means transcript text reads naturally in your notes. Cost: 1 credit per minute of video.

**What folder structure do you recommend for video notes in Obsidian?**
A simple approach that scales: `Clippings/Videos/` for all video transcripts. If you process many videos, add subfolders by channel or topic — `Clippings/Videos/Harvard/`, `Clippings/Videos/Research/`. Dataview can query across all of these with a simple `FROM "Clippings/Videos"` clause.

---

*[Extract a YouTube transcript for Obsidian](/youtube-transcript-generator) — free for auto-caption videos, Markdown export with YAML frontmatter included.*
