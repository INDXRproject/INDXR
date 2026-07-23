// Curated "See also" links per article — max 3, each with a reason (writing-standard C4/C11b).
// The rule: the parent topic or nearest sibling, plus the docs spec that carries the exact fields.
// Keyed by article slug. Hand-curated, not auto-generated (avoids "overlink and dilute").

export type Related = { href: string; label: string; reason: string }

export const RELATED_ARTICLES: Record<string, Related[]> = {
  // ── Troubleshooting ──
  "youtube-transcript-not-available": [
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "the workaround when a URL won't extract — upload the audio" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "when the captions come back in the wrong language" },
    { href: "/docs/how-indxr-works", label: "How INDXR works", reason: "the extraction and transcription pipeline in full" },
  ],
  "youtube-age-restricted-transcript": [
    { href: "/articles/youtube-members-only-transcript", label: "Members-only videos", reason: "the other access restriction, and what's possible" },
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "the upload workaround if you have the file" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "every reason a transcript is missing" },
  ],
  "youtube-members-only-transcript": [
    { href: "/articles/youtube-age-restricted-transcript", label: "Age-restricted videos", reason: "the other access restriction" },
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "the legitimate workaround via audio upload" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "every reason a transcript is missing" },
  ],
  "youtube-transcript-non-english": [
    { href: "/docs/reference/accuracy", label: "Accuracy and languages", reason: "how accurate each language is, per AssemblyAI's WER bands" },
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "for non-English audio that isn't on YouTube" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when there's no caption track at all" },
  ],
  "youtube-transcript-without-extension": [
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when the transcript is missing, not just the extension" },
    { href: "/articles/youtube-to-text", label: "Plain text (TXT)", reason: "the simplest way to get a video's text" },
    { href: "/docs/quickstart", label: "Quickstart", reason: "your first transcript in a few minutes" },
  ],

  // ── Export Formats ──
  "youtube-to-text": [
    { href: "/docs/reference/export-formats/txt", label: "TXT format spec", reason: "the exact TXT variants and timestamp format" },
    { href: "/articles/youtube-transcript-markdown", label: "Markdown transcripts", reason: "formatted notes with frontmatter instead of plain text" },
    { href: "/articles/youtube-transcript-csv", label: "CSV export", reason: "the same transcript as spreadsheet rows" },
  ],
  "youtube-transcript-markdown": [
    { href: "/articles/youtube-transcript-obsidian", label: "Obsidian workflow", reason: "the end-to-end Obsidian setup" },
    { href: "/docs/reference/export-formats/markdown", label: "Markdown format spec", reason: "the exact YAML frontmatter keys" },
    { href: "/articles/youtube-to-text", label: "Plain text (TXT)", reason: "when you don't need Markdown structure" },
  ],
  "youtube-transcript-csv": [
    { href: "/docs/reference/export-formats/csv", label: "CSV format spec", reason: "the exact columns and encoding" },
    { href: "/articles/youtube-transcript-json", label: "JSON export", reason: "structured data with nesting, if CSV is too flat" },
    { href: "/articles/youtube-to-text", label: "Plain text (TXT)", reason: "when you just need readable text" },
  ],
  "youtube-srt-download": [
    { href: "/docs/reference/export-formats/srt", label: "SRT format spec", reason: "the exact cue and timestamp format" },
    { href: "/docs/reference/export-formats/vtt", label: "VTT format spec", reason: "the web-native sibling for HTML5 video" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "subtitles in the original language" },
  ],
  "youtube-transcript-json": [
    { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON", reason: "the chunked JSON built for retrieval" },
    { href: "/docs/reference/export-formats/json", label: "JSON format spec", reason: "the exact schema for both JSON kinds" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "loading the JSON into a database" },
  ],
  "youtube-transcript-for-rag": [
    { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking for RAG", reason: "why chunk size matters more than your embedding model" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the full extract-embed-query pipeline" },
    { href: "/docs/reference/export-formats/json", label: "JSON format spec", reason: "the exact RAG chunk schema" },
  ],

  // ── Workflows ──
  "bulk-youtube-transcript": [
    { href: "/articles/youtube-playlist-transcript", label: "Playlist transcripts", reason: "the per-video choices and costs in a playlist job" },
    { href: "/docs/guides/playlists", label: "Playlists guide", reason: "the exact playlist flow and limits" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "scaling a whole channel into search" },
  ],
  "youtube-playlist-transcript": [
    { href: "/articles/bulk-youtube-transcript", label: "Bulk extraction", reason: "downloading a whole playlist's transcripts at once" },
    { href: "/docs/guides/playlists", label: "Playlists guide", reason: "the exact playlist flow and limits" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "going from one playlist to a whole channel" },
  ],
  "audio-to-text": [
    { href: "/docs/guides/uploads", label: "Uploads guide", reason: "the exact upload flow, formats and limits" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when a YouTube URL won't extract" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "transcribing audio in other languages" },
  ],
  "youtube-transcript-obsidian": [
    { href: "/articles/youtube-transcript-markdown", label: "Markdown transcripts", reason: "the Markdown format Obsidian imports" },
    { href: "/docs/reference/export-formats/markdown", label: "Markdown format spec", reason: "the exact frontmatter keys" },
    { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON", reason: "turning your vault into a searchable knowledge base" },
  ],

  // ── Deep Dives ──
  "chunk-youtube-transcripts-for-rag": [
    { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON", reason: "the export that produces the chunks" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the full pipeline the chunks feed" },
    { href: "/docs/reference/export-formats/json", label: "JSON format spec", reason: "the exact chunk schema" },
  ],
  "youtube-channel-knowledge-base": [
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the embed-and-query steps in detail" },
    { href: "/articles/youtube-playlist-transcript", label: "Playlist transcripts", reason: "extracting the channel's videos first" },
    { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON", reason: "the export format the knowledge base uses" },
  ],
  "youtube-transcripts-vector-database": [
    { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking for RAG", reason: "picking the chunk size before you embed" },
    { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON", reason: "the export that feeds the database" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "a worked end-to-end example" },
  ],
}
