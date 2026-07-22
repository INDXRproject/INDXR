export type DocsPage = {
  href: string
  label: string
  // One-line explanation shown next to the title on the /docs hub. Kept out of the
  // sidebar (which stays label-only for density).
  description?: string
  indent?: number
}

export type DocsSection = {
  label: string
  pages: DocsPage[]
}

export type DocsConfig = {
  sections: DocsSection[]
}

// Diátaxis-shaped: categorised by what the reader comes to do (learn / do / look up / account),
// not by topic (ADR-075). URLs mirror the category.
export const docsConfig: DocsConfig = {
  sections: [
    {
      label: "Getting started",
      pages: [
        { href: "/docs/quickstart", label: "Quickstart", description: "Your first transcript in under three minutes." },
        { href: "/docs/how-indxr-works", label: "How INDXR works", description: "How extraction and AI transcription fit together." },
        { href: "/docs/faq", label: "FAQ", description: "Short answers to the most common questions." },
      ],
    },
    {
      label: "Guides",
      pages: [
        { href: "/docs/guides/single-video", label: "Single video", description: "Paste a link, get a transcript." },
        { href: "/docs/guides/playlists", label: "Playlists", description: "Turn a whole playlist into transcripts in one job." },
        { href: "/docs/guides/uploads", label: "Audio & video uploads", description: "Transcribe files you already have." },
        { href: "/docs/guides/library", label: "Library", description: "Where your transcripts are saved, edited, and searched." },
        { href: "/docs/guides/summaries", label: "Summaries", description: "AI summaries of a transcript, and what they cost." },
      ],
    },
    {
      label: "Reference",
      pages: [
        { href: "/docs/reference/export-formats", label: "Export formats", description: "The seven formats and when to use each." },
        { href: "/docs/reference/export-formats/txt", label: "TXT", description: "Readable plain-text paragraphs.", indent: 1 },
        { href: "/docs/reference/export-formats/markdown", label: "Markdown", description: "Frontmatter and timestamp headings for note apps.", indent: 1 },
        { href: "/docs/reference/export-formats/csv", label: "CSV", description: "One row per segment, for spreadsheets.", indent: 1 },
        { href: "/docs/reference/export-formats/srt", label: "SRT", description: "SubRip subtitles with comma timestamps.", indent: 1 },
        { href: "/docs/reference/export-formats/vtt", label: "VTT", description: "WebVTT subtitles for HTML5 video.", indent: 1 },
        { href: "/docs/reference/export-formats/json", label: "JSON & RAG JSON", description: "Raw segments, or chunked JSON for vector databases.", indent: 1 },
        { href: "/docs/reference/accuracy", label: "Accuracy and languages", description: "Which model runs, how accurate it is, and the languages covered." },
        { href: "/docs/reference/limits", label: "Limits", description: "File size, length, playlist, and rate limits." },
      ],
    },
    {
      label: "Account",
      pages: [
        { href: "/docs/account/credits", label: "Credits", description: "What costs credits, the reserve model, and refunds." },
        { href: "/docs/account/billing", label: "Billing and invoices", description: "Buying credits, invoices, purchase history, and VAT." },
        { href: "/docs/account/settings", label: "Settings", description: "Preferences, RAG chunk size, email, and account deletion." },
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
