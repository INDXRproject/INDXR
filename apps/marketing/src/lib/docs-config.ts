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

// Four categories that follow the order of use: Start here → Using INDXR → Exports → Account
// (ADR-074). URLs are kept stable where a page already existed; only split/new/removed routes
// change path (see next.config.ts redirects).
export const docsConfig: DocsConfig = {
  sections: [
    {
      label: "Start here",
      pages: [
        { href: "/docs/getting-started", label: "Quickstart", description: "Get your first transcript in under three minutes." },
        { href: "/docs/faq", label: "FAQ", description: "Short answers to the most common questions." },
      ],
    },
    {
      label: "Using INDXR",
      pages: [
        { href: "/docs/how-indxr-works/overview", label: "Overview", description: "How extraction and AI transcription fit together." },
        { href: "/docs/how-indxr-works/accuracy", label: "Accuracy and languages", description: "Which model runs, how accurate it is, and the languages covered." },
        { href: "/docs/using-indxr/playlists", label: "Playlists", description: "Turn a whole playlist into transcripts in one job." },
        { href: "/docs/using-indxr/your-library", label: "Your library", description: "Where your transcripts are saved, edited, and searched." },
        { href: "/docs/how-indxr-works/summaries", label: "Summaries", description: "AI summaries of a transcript, and what they cost." },
      ],
    },
    {
      label: "Exports",
      pages: [
        { href: "/docs/how-indxr-works/export-formats", label: "Export formats", description: "The seven formats and when to use each." },
        { href: "/docs/how-indxr-works/export-formats/txt", label: "TXT", description: "Readable plain-text paragraphs.", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/markdown", label: "Markdown", description: "Frontmatter and timestamp headings for note apps.", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/csv", label: "CSV", description: "One row per segment, for spreadsheets.", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/srt", label: "SRT", description: "SubRip subtitles with comma timestamps.", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/vtt", label: "VTT", description: "WebVTT subtitles for HTML5 video.", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/json", label: "JSON & RAG JSON", description: "Raw segments, or chunked JSON for vector databases.", indent: 1 },
      ],
    },
    {
      label: "Account",
      pages: [
        { href: "/docs/account/credits", label: "Credits", description: "What costs credits, the reserve model, and refunds." },
        { href: "/docs/account/billing", label: "Billing and invoices", description: "Buying credits, invoices, purchase history, and VAT." },
        { href: "/docs/account/settings", label: "Settings", description: "Preferences, RAG chunk size, email, and account deletion." },
        { href: "/docs/how-indxr-works/limits", label: "Limits", description: "File size, length, playlist, and rate limits." },
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
