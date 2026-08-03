// Real export output shown on the homepage — NOT hand-typed. Every fragment below is verbatim
// generator output, only truncated (…) where a line was too long for the card.
//
// Provenance (reproducible): the fixture video kBdfcR-8hEY — "Justice: What's The Right Thing To
// Do? Episode 01 'THE MORAL SIDE OF MURDER'" (Harvard University, product-truth §8) — its stored
// transcript (1142 caption segments) run through the real generators in
// packages/shared/src/utils/formatTranscript.ts on 2026-08-03:
//   • MARKDOWN   = generateMarkdown(transcript, title, /*withTimestamps*/ true,
//                    { videoId, channel:"Harvard University", language:"en", durationSeconds:3282,
//                      extractionMethod:"youtube_captions", includeYamlFrontmatter:true })
//                  → frontmatter + the [00:00:33] section (text truncated).
//   • SRT        = generateSrt(transcript, { extractionMethod:"youtube_captions" }) → cues 3–5.
//   • RAG JSON   = buildRagJson(transcript, { videoId, title, channel, language, durationSeconds:3282,
//                    extractionMethod:"youtube_captions" }) → chunk 5 of 60 (text truncated).
// The `deep_link` / `chunk_id` / `token_count_estimate` / `total_chunks` fields are exactly what the
// generator emits — there is no `source_url` field (that was the fabricated schema we removed).
// To regenerate: re-run the two scripts noted in the 2026-08-03 LOG entry against the fixture.

export const HOME_SAMPLE_MARKDOWN = `---
title: "Justice: What's The Right Thing To Do? Episode 01 \\"THE MORAL SIDE OF MURDER\\""
url: "https://www.youtube.com/watch?v=kBdfcR-8hEY"
channel: "Harvard University"
duration: 3282
language: "en"
transcript_source: "YouTube captions"
created: "2026-08-03"
type: youtube
tags: [youtube, transcript]
---

# Justice: What's The Right Thing To Do? Episode 01 "THE MORAL SIDE OF MURDER"

## [00:00:33](https://youtu.be/kBdfcR-8hEY?t=33)
This is a course about Justice and we begin with a story suppose you're the
driver of a trolley car, and your trolley car is hurdling down the track at
sixty miles an hour and at the end of the track you notice five workers …`

export const HOME_SAMPLE_SRT = `3
00:00:33,509 --> 00:00:37,750
This is a course about Justice and we
begin with a story

4
00:00:37,750 --> 00:00:44,640
suppose you're the driver of a trolley
car, and your trolley car is hurdling down
the track at sixty miles an hour

5
00:00:44,640 --> 00:00:49,390
and at the end of the track you notice
five workers working on the track`

export const HOME_SAMPLE_RAG = `{
  "chunk_index": 5,
  "chunk_id": "kBdfcR-8hEY_chunk_005",
  "text": "standing on a bridge overlooking a trolley car track and down
           the track comes a trolley car at the end of the track are five
           workers the brakes don't …",
  "start_time": 278.529,
  "end_time": 338.93,
  "deep_link": "https://youtu.be/kBdfcR-8hEY?t=278",
  "token_count_estimate": 136,
  "metadata": {
    "video_id": "kBdfcR-8hEY",
    "title": "Justice: What's The Right Thing To Do? Episode 01 …",
    "channel": "Harvard University",
    "language": "en",
    "chunk_index": 5,
    "start_time": 278.529,
    "end_time": 338.93,
    "total_chunks": 60
  }
}`
