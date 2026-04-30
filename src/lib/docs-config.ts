export type DocsPage = {
  href: string
  label: string
}

export type DocsSection = {
  label: string
  slug?: string
  pages: DocsPage[]
}

export type DocsConfig = {
  sections: DocsSection[]
}

export const docsConfig: DocsConfig = {
  sections: [
    {
      label: "Getting started",
      slug: "getting-started",
      pages: [
        { href: "/docs/getting-started", label: "Welcome to INDXR" },
      ],
    },
    {
      label: "Transcribe",
      pages: [
        { href: "/youtube-transcript-not-available", label: "Transcript availability" },
        { href: "/youtube-age-restricted-transcript", label: "Age-restricted videos" },
        { href: "/youtube-members-only-transcript", label: "Members-only videos" },
        { href: "/youtube-transcript-non-english", label: "Non-English transcripts" },
        { href: "/bulk-youtube-transcript", label: "Bulk / playlist transcripts" },
        { href: "/youtube-playlist-transcript", label: "Playlist guide" },
        { href: "/audio-to-text", label: "Audio file transcription" },
        { href: "/youtube-transcript-without-extension", label: "Without browser extension" },
      ],
    },
    {
      label: "Export",
      pages: [
        { href: "/youtube-to-text", label: "Plain text (TXT)" },
        { href: "/youtube-transcript-markdown", label: "Markdown" },
        { href: "/youtube-transcript-csv", label: "CSV" },
        { href: "/youtube-srt-download", label: "SRT / VTT subtitles" },
        { href: "/youtube-transcript-json", label: "JSON" },
        { href: "/youtube-transcript-for-rag", label: "RAG-optimized JSON" },
      ],
    },
    {
      label: "Workflows",
      pages: [
        { href: "/youtube-transcript-obsidian", label: "Obsidian workflow" },
        { href: "/blog/chunk-youtube-transcripts-for-rag", label: "Chunking for RAG" },
        { href: "/blog/youtube-channel-knowledge-base", label: "YouTube knowledge base" },
        { href: "/blog/youtube-transcripts-vector-database", label: "Vector database workflows" },
      ],
    },
    {
      label: "Compare",
      pages: [
        { href: "/alternative/downsub", label: "INDXR vs DownSub" },
        { href: "/alternative/notegpt", label: "INDXR vs NoteGPT" },
        { href: "/alternative/turboscribe", label: "INDXR vs TurboScribe" },
        { href: "/alternative/tactiq", label: "INDXR vs Tactiq" },
        { href: "/alternative/happyscribe", label: "INDXR vs HappyScribe" },
      ],
    },
    {
      label: "Account",
      pages: [
        { href: "/docs/account", label: "Credits and billing" },
      ],
    },
    {
      label: "FAQ",
      pages: [
        { href: "/docs/faq", label: "Frequently asked questions" },
      ],
    },
  ],
}

export function findPageInDocs(href: string): { section: DocsSection; page: DocsPage } | null {
  for (const section of docsConfig.sections) {
    const page = section.pages.find((p) => p.href === href)
    if (page) return { section, page }
  }
  return null
}
