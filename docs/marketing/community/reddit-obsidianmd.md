# r/ObsidianMD — workflow-post (Khidr plaatst)

**Lees eerst de regels in de zijbalk; kies flair "Showcase" of wat daar voor workflows bedoeld is.**

**Titel:**
My workflow for turning YouTube lectures into searchable notes in Obsidian

**Tekst:**

I watch a lot of long lectures and talks, and for years the problem was the same: I'd remember that someone said something useful, but not where. Here's the workflow I ended up with. It works with any transcript source; I'll mention the tool I use at the end.

**1. Get a transcript with timestamps, not just text.** A wall of text is hard to use later. What helps is paragraphs, speaker labels if there's more than one person, and a timestamp at each section, so you can jump back to the exact moment in the video.

**2. Export as Markdown with frontmatter.** I keep these fields in the YAML frontmatter: `title`, `channel`, `duration`, `language`, plus a `source` URL. That makes them queryable with Dataview, e.g. a table of every lecture from one channel.

```
TABLE channel, duration
FROM "Sources/Lectures"
SORT file.ctime DESC
```

**3. Keep sources separate from your own notes.** All transcripts go in `Sources/`. I never edit them. My own thinking lives in normal notes that link to them, like `[[Lecture title#12:40]]` for the exact part I'm referring to. Timestamp headings in the transcript make those heading links work.

**4. Skim before you commit.** For a two-hour talk I first read a chapter summary to decide whether it's worth watching in full. If it is, I watch with the transcript open and highlight the parts I want to keep.

**5. Whole series at once.** For a course on YouTube I import the playlist in one go, so every lecture becomes its own note in the same folder with the same structure.

Full disclosure: I built the tool I use for steps 1, 2 and 5 (INDXR, https://indxr.ai/?utm_source=reddit_obsidian). YouTube captions are free there; it costs credits only when a video has no captions or for your own recordings. But the workflow works just as well with any transcript you can get as Markdown, and I'm curious how others here handle long video sources.

---
Notities voor Khidr:
- Voeg indien mogelijk 1–2 screenshots van je eigen vault toe (bron-notitie + een eigen notitie die ernaar linkt). Echte beelden werken beter dan tekst.
- Check de Dataview-query en de kop-link (`[[Titel#12:40]]`) in je eigen vault voordat je plaatst: de link werkt alleen als de Markdown-export tijdstempel-kopjes in precies die vorm geeft. Pas mapnaam en voorbeeld aan naar wat jij echt ziet.
