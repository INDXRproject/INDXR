# Download YouTube Transcripts as CSV — Spreadsheet-Ready Data

**Meta title:** Download YouTube Transcript as CSV — Spreadsheet-Ready for Research | INDXR.AI
**Meta description:** Export YouTube transcripts as CSV with segment index, start and end timestamps, text, and word count. UTF-8 BOM for Excel compatibility. Works for single videos and playlists.
**Slug:** /youtube-transcript-csv
**Schema:** SoftwareApplication + FAQPage
**Internal links:** /youtube-transcript-generator, /pricing, /bulk-youtube-transcript, /youtube-transcript-json
**Word count:** ~900 words

---

A plain text transcript is readable. A CSV transcript is analyzable. If you're doing computational text analysis, word frequency counts, timestamp-based research annotation, or corpus analysis across multiple videos, the CSV export gives you the structured data you need without manual reformatting.

INDXR.AI exports YouTube transcripts as properly-structured CSV files with segment index, start time, end time, text, and word count per segment. For playlist exports, video ID and title columns are added so you can work with multiple videos in a single file.

---

## What the CSV Contains

Each row in the CSV represents one transcript segment — a continuous unit of speech as detected by YouTube's captioning system or AssemblyAI's speech recognition.

| Column | Type | Description |
|---|---|---|
| `segment_index` | Integer | Sequential position of this segment (0-indexed) |
| `start_time` | Float | Start time in seconds (e.g., 0.0, 14.3, 247.8) |
| `end_time` | Float | End time in seconds (start + duration) |
| `duration` | Float | Length of this segment in seconds |
| `text` | String | Transcript text for this segment |
| `word_count` | Integer | Number of words in this segment |

For playlist exports, two additional columns prepend the above:

| Column | Type | Description |
|---|---|---|
| `video_id` | String | YouTube video ID (e.g., dQw4w9WgXcQ) |
| `video_title` | String | Title of the video this segment belongs to |

**Encoding:** UTF-8 with BOM (Byte Order Mark). This matters for Excel compatibility — without BOM, Excel frequently misinterprets UTF-8 encoded files and displays garbled text for non-Latin characters (Arabic, Chinese, Japanese, Korean, and others). Google Sheets handles UTF-8 with or without BOM correctly.

---

## Opening in Excel and Google Sheets

**Excel:** Double-clicking the CSV file opens it correctly in most Excel versions because of the UTF-8 BOM. If the formatting looks wrong, use Data → From Text/CSV and specify UTF-8 encoding manually.

**Google Sheets:** File → Import → Upload. Sheets detects the encoding automatically and imports cleanly.

**Python/pandas:**
```python
import pandas as pd

df = pd.read_csv("transcript.csv", encoding="utf-8-sig")  # utf-8-sig handles BOM
print(df.head())
print(f"Total segments: {len(df)}")
print(f"Total words: {df['word_count'].sum()}")
print(f"Duration: {df['end_time'].max():.1f} seconds")
```

**R:**
```r
library(readr)
df <- read_csv("transcript.csv", locale = locale(encoding = "UTF-8"))
```

---

## Common Research Use Cases

**Computational text analysis.** Load the CSV into Voyant Tools (voyant-tools.org), DARIAH's Topic Explorer, or a Python NLP pipeline. The structured format — one segment per row with timestamps — makes it straightforward to apply word frequency analysis, keyword-in-context, topic modeling, or sentiment analysis with temporal context (which parts of the video discuss which topics).

**Corpus analysis across multiple videos.** Extract a playlist and download the combined CSV with `video_id` and `video_title` columns. Filter by video in Excel, Python, or R to compare vocabulary, speaking pace (words per minute derived from `word_count` / `duration`), or topic distribution across a speaker's output over time.

**Timestamped annotation.** The `start_time` and `end_time` columns let you link analysis results back to specific moments in the video. A keyword that appears at segment index 47 starting at 284.2 seconds maps to a specific YouTube timestamp — useful for academic citation or user-facing applications that want to surface the relevant video moment alongside analysis results.

**Subtitle timing analysis.** For researchers studying accessibility or subtitle quality, the segment timing data reveals patterns in how YouTube's auto-captioning system breaks speech — average segment lengths, variance, gaps between segments.

---

## Auto-Captions vs. AI Transcription for CSV

The same quality distinction that applies to other export formats applies here. Auto-caption CSV files will have unpunctuated lowercase text and segments of 2–5 seconds. AI transcription CSV files have properly punctuated text and more natural segment boundaries.

For text analysis tasks that don't depend on punctuation (word frequency, keyword search, topic modeling), auto-caption CSV is often sufficient and costs nothing. For tasks that rely on sentence structure — readability scoring, syntactic analysis, named entity recognition — AI transcription produces meaningfully better input data.

---

## Playlist CSV Export

For playlist extractions, you can download all video CSVs as a ZIP (one file per video) or as a single merged CSV with `video_id` and `video_title` columns. The merged option is useful for cross-video analysis — a single DataFrame in pandas covering an entire lecture series or research corpus, with video identity preserved in each row.

---

## Frequently Asked Questions

**Is CSV export free?**
Yes. Like all export formats, CSV export has no additional credit cost beyond the base extraction. Auto-caption extraction is free; AI Transcription costs 1 credit per minute. Once you have a transcript in your library, you can export it as CSV (or any other format) at any time at no additional cost.

**Why is `end_time` included when I can calculate it from `start_time + duration`?**
Convenience. The calculation is trivial but having `end_time` as a pre-computed column saves repeated formula work in Excel and eliminates a transformation step in pandas or R. Both values are included because downstream tools may need either form.

**Does the CSV include the full video metadata?**
Not as columns in the main data — only `segment_index`, `start_time`, `end_time`, `duration`, `text`, and `word_count` per segment (plus `video_id` and `video_title` for playlists). For video-level metadata (channel, total duration, language, source URL), export as JSON instead — the JSON format includes a full `video` metadata wrapper.

**Does it work for videos in non-Latin scripts?**
Yes. The UTF-8 BOM encoding handles Arabic, Chinese, Japanese, Korean, Hebrew, and other non-Latin scripts correctly. Excel opens these files without character encoding issues.

**Can I export a playlist as a single merged CSV?**
Yes. After playlist extraction, the bulk export options include both "one file per video (ZIP)" and "merged single CSV." The merged CSV includes `video_id` and `video_title` columns so you can identify and filter by source video.

---

*[Extract any YouTube transcript as CSV free](/youtube-transcript-generator) — auto-caption videos export instantly at no cost.*
