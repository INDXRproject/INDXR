# Export-block demos (FASE 4)

The homepage's three export blocks (Markdown, SRT, RAG JSON) should stop reading like code and start
reading like **the file in the place where it's used**. Everything here uses the **real** fixture export
— generated from the stored transcript of `kBdfcR-8hEY` ("Justice… — Episode 01", 1142 segments) through
the app's own generators in `packages/shared/src/utils/formatTranscript.ts`. Nothing is mocked.

## Real exports — `fixture/`
| File | What | Generator |
|------|------|-----------|
| `justice.srt` | 62 KB, real cues | `generateSrt` |
| `justice.vtt` | WEBVTT sibling | `generateVtt` |
| `justice.md` | 39 KB, YAML frontmatter + timestamped sections | `generateMarkdown` |
| `justice.rag.json` | **60 chunks**, `deep_link`/`chunk_id`/`token_count_estimate` (no `source_url`) | `buildRagJson` |
| `neutral-player.mp4` | dark 60 s filler for the SRT player (no YouTube frame — ADR-088) | ffmpeg |

To regenerate after the transcript changes: a short Supabase-fetch + generator script (service-role read of
`transcripts` where `video_id=kBdfcR-8hEY`); the recipe is in the FASE-4 LOG entry (2026-08-07). Not kept in
the repo — it's a one-off.

## 1. SRT → subtitles (browser ✓)
`srt-demo.html` loads the real `justice.srt`, converts each cue, and renders it as a **subtitle over a video
player** — the SRT's natural habitat. Shoot it with `node capture-srt.mjs` →
`srt-demo-{light,dark}.png`. Seeks to cue 3 ("This is a course about Justice and we begin with a story").

## 2. RAG JSON → retrieval (browser ✓)
`rag-demo.html` loads the real 60-chunk `justice.rag.json`, runs a query ("the driver of a trolley car"),
and shows the **best-matching chunk with its timestamp** and `deep_link` — proving the export works for
retrieval, not just that it exists. Shoot with `node capture-rag.mjs` → `rag-demo-{light,dark}.png`.
Verified answer: chunk 4 @ **3:45**, `https://youtu.be/kBdfcR-8hEY?t=225`.

## 3. Markdown → Obsidian (needs ONE screenshot from Khidr)
**Obsidian has no web/browser version** — it's a local desktop (Win/Mac/Linux) + mobile app; "Obsidian
Publish" is hosting, not the editor. So this one can't be driven in the browser. The real file is ready
(`fixture/justice.md`); it needs a single photograph from the desktop app.

**The one screenshot to take (one image, not a series):**
1. Drag `apps/video/export-demos/fixture/justice.md` into any Obsidian vault; open it in **Reading view**, **Light** theme.
2. Make sure the **Properties** panel is showing at the top — Obsidian renders the YAML frontmatter as
   Properties: `title`, `url`, `duration`, `language`, `transcript_source`, `created`, `type`, `tags`.
3. Frame from the note **title** down through the **Properties panel** and the **first timestamped section**
   (`## [00:00:33]` with its clickable `youtu.be/…?t=33` link) — enough to show "frontmatter becomes
   properties" and "timestamps are clickable" in one shot. ~1200 px wide.

That single image replaces the Markdown code block; the SRT and RAG PNGs replace the other two.
None of these are wired into the homepage yet — they're prepared assets for review.
