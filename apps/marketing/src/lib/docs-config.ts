export type DocsPage = {
  href: string
  label: string
  indent?: number
}

export type DocsSection = {
  label: string
  pages: DocsPage[]
}

export type DocsConfig = {
  sections: DocsSection[]
}

export const docsConfig: DocsConfig = {
  sections: [
    {
      label: "Getting started",
      pages: [
        { href: "/docs/getting-started", label: "Quickstart" },
      ],
    },
    {
      label: "How INDXR works",
      pages: [
        { href: "/docs/how-indxr-works/overview", label: "Overview" },
        { href: "/docs/how-indxr-works/credits", label: "How credits work" },
        { href: "/docs/how-indxr-works/accuracy", label: "Accuracy" },
        { href: "/docs/how-indxr-works/accuracy/auto-captions", label: "Auto-captions", indent: 1 },
        { href: "/docs/how-indxr-works/accuracy/ai-transcription", label: "AI transcription", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats", label: "Export formats" },
        { href: "/docs/how-indxr-works/export-formats/txt", label: "Plain text (TXT)", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/markdown", label: "Markdown", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/csv", label: "CSV", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/srt", label: "SRT subtitles", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/vtt", label: "VTT subtitles", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/json", label: "JSON / RAG JSON", indent: 1 },
        { href: "/docs/how-indxr-works/languages", label: "Supported languages" },
        { href: "/docs/how-indxr-works/limits", label: "Limits" },
        { href: "/docs/how-indxr-works/api", label: "API" },
      ],
    },
    {
      label: "Account & data",
      pages: [
        { href: "/docs/account-and-data/credits-and-billing", label: "Credits and billing" },
        { href: "/docs/account-and-data/data-handling", label: "How we handle your data" },
      ],
    },
    {
      label: "Help",
      pages: [
        { href: "/docs/help/how-to", label: "How-to guides" },
        { href: "/docs/help/troubleshooting", label: "Troubleshooting" },
        { href: "/docs/help/faq", label: "FAQ" },
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
