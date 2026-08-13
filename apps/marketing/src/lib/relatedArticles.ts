// Curated "See also" links per article — max 3, each with a reason (writing-standard C4/C11b).
// The rule: the parent topic or nearest sibling, plus the docs spec that carries the exact fields.
// Keyed by article slug. Hand-curated, not auto-generated (avoids "overlink and dilute").

export type Related = { href: string; label: string; reason: string }

export const RELATED_ARTICLES: Record<string, Related[]> = {
  // ── Troubleshooting ──
  "youtube-transcript-not-available": [
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "the workaround when a URL won't extract — upload the audio" },
    { href: "/articles/video-to-text", label: "Video to text", reason: "if you have the video file, upload it for the text directly" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "when the captions come back in the wrong language" },
    { href: "/docs/how-indxr-works", label: "How INDXR works", reason: "the extraction and transcription pipeline in full" },
  ],
  "youtube-transcript-non-english": [
    { href: "/docs/reference/accuracy", label: "Accuracy and languages", reason: "how accurate each language is, per AssemblyAI's WER bands" },
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "for non-English audio that isn't on YouTube" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when there's no caption track at all" },
  ],
  "youtube-transcript-without-extension": [
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when the transcript is missing, not just the extension" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "every format you can get a video's text out as" },
    { href: "/docs/quickstart", label: "Quickstart", reason: "your first transcript in a few minutes" },
  ],

  // ── Export Formats ──
  "transcript-export-formats": [
    { href: "/docs/reference/export-formats", label: "Export formats reference", reason: "the exact fields, columns and schema for every format" },
    { href: "/articles/video-to-text", label: "Video to text", reason: "getting a video file's words out before you export them" },
    { href: "/articles/youtube-transcript-obsidian", label: "Obsidian workflow", reason: "the Markdown export in an end-to-end note-taking setup" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "loading the RAG JSON into a database" },
  ],

  // ── Workflows ──
  "youtube-playlist-transcript": [
    { href: "/docs/guides/playlists", label: "Playlists guide", reason: "the exact playlist flow and limits" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "going from one playlist to a whole channel" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the formats a whole playlist exports as, in bulk" },
  ],
  "audio-to-text": [
    { href: "/docs/guides/uploads", label: "Uploads guide", reason: "the exact upload flow, formats and limits" },
    { href: "/articles/video-to-text", label: "Video to text", reason: "the same for a video file, with subtitles and the picture discarded" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when a YouTube URL won't extract" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "transcribing audio in other languages" },
  ],
  "video-to-text": [
    { href: "/articles/audio-to-text", label: "Audio file transcription", reason: "the same for a recording you want the words from, not a video" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "every format a video's text exports as" },
    { href: "/docs/guides/uploads", label: "Uploads guide", reason: "the exact upload flow, formats and limits" },
  ],
  "youtube-transcript-obsidian": [
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the Markdown export Obsidian imports, and every other format" },
    { href: "/docs/reference/export-formats/markdown", label: "Markdown format spec", reason: "the exact frontmatter keys" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "turning your vault into searchable knowledge" },
  ],

  // ── Deep Dives ──
  "chunk-youtube-transcripts-for-rag": [
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the RAG JSON export that produces the chunks" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the full pipeline the chunks feed" },
    { href: "/docs/reference/export-formats/json", label: "JSON format spec", reason: "the exact chunk schema" },
  ],
  "youtube-channel-knowledge-base": [
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the embed-and-query steps in detail" },
    { href: "/articles/youtube-playlist-transcript", label: "Playlist transcripts", reason: "extracting the channel's videos first" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the RAG JSON export the knowledge base uses" },
  ],
  "youtube-transcripts-vector-database": [
    { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking for RAG", reason: "picking the chunk size before you embed" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the RAG JSON export that feeds the database" },
    { href: "/articles/youtube-channel-knowledge-base", label: "Channel knowledge base", reason: "a worked end-to-end example" },
  ],
}
