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
        { href: "/docs/faq", label: "FAQ" },
      ],
    },
    {
      label: "How INDXR works",
      pages: [
        { href: "/docs/how-indxr-works/overview", label: "Overview" },
        { href: "/docs/how-indxr-works/accuracy", label: "Accuracy and languages" },
        { href: "/docs/how-indxr-works/export-formats", label: "Export formats" },
        { href: "/docs/how-indxr-works/export-formats/txt", label: "Plain text (TXT)", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/markdown", label: "Markdown", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/csv", label: "CSV", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/srt", label: "SRT subtitles", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/vtt", label: "VTT subtitles", indent: 1 },
        { href: "/docs/how-indxr-works/export-formats/json", label: "JSON / RAG JSON", indent: 1 },
        { href: "/docs/how-indxr-works/summaries", label: "Summaries" },
        { href: "/docs/how-indxr-works/limits", label: "Limits" },
      ],
    },
    {
      label: "Account & data",
      pages: [
        { href: "/docs/account-and-data/credits-and-billing", label: "Credits and billing" },
        { href: "/docs/account-and-data/data-handling", label: "How we handle your data" },
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
