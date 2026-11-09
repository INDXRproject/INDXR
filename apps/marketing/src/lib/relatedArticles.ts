// Curated "See also" links per article — max 3, each with a reason (writing-standard C4/C11b).
// The rule: the parent topic or nearest sibling, plus the docs spec that carries the exact fields.
// Keyed by article slug. Hand-curated, not auto-generated (avoids "overlink and dilute").

export type Related = { href: string; label: string; reason: string }

export const RELATED_ARTICLES: Record<string, Related[]> = {
  // ── Research with your sources ──
  "claude-chatgpt-own-sources": [
    { href: "/docs/guides/ai-assistants", label: "Connect Claude or ChatGPT", reason: "the exact setup steps for Claude, Claude Code and ChatGPT" },
    { href: "/articles/cite-youtube-video-apa", label: "Cite a YouTube video in APA 7", reason: "the reference format the assistant hands back with every source" },
    { href: "/articles/transcribe-interviews-journalism", label: "Transcribe interviews", reason: "getting your own recordings into the library first" },
  ],
  "transcribe-interviews-journalism": [
    { href: "/docs/guides/uploads", label: "Uploads guide", reason: "formats, file size and length limits for your recordings" },
    { href: "/articles/claude-chatgpt-own-sources", label: "Claude or ChatGPT with your own sources", reason: "drafting from your interviews with quotes you can check" },
    { href: "/articles/audio-to-text", label: "Audio and video to text", reason: "how the transcript itself is made, and what it costs" },
  ],
  "cite-youtube-video-apa": [
    { href: "/docs/guides/library", label: "Library guide", reason: "where the ready citation sits on every transcript" },
    { href: "/articles/claude-chatgpt-own-sources", label: "Claude or ChatGPT with your own sources", reason: "answers that come back with the APA reference attached" },
    { href: "/articles/youtube-to-notes", label: "Study notes from a lecture playlist", reason: "notes with a reference per section" },
  ],

  // ── Troubleshooting ──
  "youtube-transcript-not-available": [
    { href: "/articles/audio-to-text", label: "Audio and video to text", reason: "the workaround when a URL won't extract: upload the file" },
    { href: "/articles/youtube-transcript-non-english", label: "Non-English transcripts", reason: "when the captions come back in the wrong language" },
    { href: "/docs/how-indxr-works", label: "How INDXR works", reason: "the extraction and transcription pipeline in full" },
  ],
  "youtube-transcript-non-english": [
    { href: "/docs/reference/accuracy", label: "Accuracy and languages", reason: "how accurate each language is, per AssemblyAI's WER bands" },
    { href: "/articles/audio-to-text", label: "Audio and video to text", reason: "for non-English audio that isn't on YouTube" },
    { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?", reason: "when there's no caption track at all" },
  ],
  // ── Export Formats ──
  "transcript-export-formats": [
    { href: "/docs/reference/export-formats", label: "Export formats reference", reason: "the exact fields, columns and schema for every format" },
    { href: "/docs/guides/ai-assistants", label: "Connect Claude or ChatGPT", reason: "the no-export option: ask your library directly" },
    { href: "/articles/srt-generator", label: "SRT generator", reason: "create the subtitle file itself, SRT or VTT, from a video or recording" },
  ],
  "srt-generator": [
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "every other export format, and importing subtitles into a specific editor" },
    { href: "/docs/reference/export-formats/srt", label: "SRT format spec", reason: "the exact cue and comma-millisecond timestamp shape" },
    { href: "/docs/reference/export-formats/vtt", label: "VTT format spec", reason: "the WEBVTT header and the <v> voice tag" },
  ],

  // ── Workflows ──
  "youtube-playlist-transcript": [
    { href: "/docs/guides/playlists", label: "Playlists guide", reason: "the exact playlist flow and limits" },
    { href: "/articles/claude-chatgpt-own-sources", label: "Claude or ChatGPT with your own sources", reason: "asking questions across the whole playlist once it is in your library" },
    { href: "/articles/youtube-to-notes", label: "Study notes from a lecture playlist", reason: "turning a course into notes with a reference per section" },
  ],
  "audio-to-text": [
    { href: "/docs/guides/uploads", label: "Uploads guide", reason: "the exact upload flow, formats and limits" },
    { href: "/articles/transcribe-interviews-journalism", label: "Transcribe interviews", reason: "checking every quote against the recording" },
    { href: "/docs/guides/ai-assistants", label: "Connect Claude or ChatGPT", reason: "ask your recordings questions and get quotes with timestamps" },
  ],
  "youtube-to-notes": [
    { href: "/docs/guides/ai-assistants", label: "Connect Claude or ChatGPT", reason: "the setup for writing notes from your own collection" },
    { href: "/articles/cite-youtube-video-apa", label: "Cite a YouTube video in APA 7", reason: "the reference format each section points to" },
    { href: "/docs/reference/export-formats/markdown", label: "Markdown format spec", reason: "the exact frontmatter keys of the summary export" },
  ],

  // ── Deep Dives ──
  "chunk-youtube-transcripts-for-rag": [
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the full pipeline the chunks feed" },
    { href: "/docs/reference/export-formats/json", label: "JSON format spec", reason: "the exact chunk schema" },
    { href: "/articles/claude-chatgpt-own-sources", label: "Claude or ChatGPT with your own sources", reason: "the no-code route, if you only want answers with timestamps" },
  ],
  "youtube-channel-knowledge-base": [
    { href: "/docs/guides/ai-assistants", label: "Connect Claude or ChatGPT", reason: "the no-code half of this article, step by step" },
    { href: "/articles/youtube-playlist-transcript", label: "Playlist transcripts", reason: "extracting the channel's videos first" },
    { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in vector databases", reason: "the embed-and-query steps in detail" },
  ],
  "youtube-transcripts-vector-database": [
    { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking for RAG", reason: "picking the chunk size before you embed" },
    { href: "/articles/transcript-export-formats", label: "Transcript export formats", reason: "the RAG JSON export that feeds the database" },
    { href: "/articles/claude-chatgpt-own-sources", label: "Claude or ChatGPT with your own sources", reason: "the no-code route, if you only want answers with timestamps" },
  ],
}
