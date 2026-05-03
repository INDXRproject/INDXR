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
      label: "Account",
      pages: [
        { href: "/docs/account", label: "Credits and billing" },
        { href: "/docs/credits", label: "How credits work" },
        { href: "/docs/limits", label: "Usage limits" },
      ],
    },
    {
      label: "Accuracy",
      pages: [
        { href: "/docs/accuracy", label: "Accuracy overview" },
        { href: "/docs/accuracy/auto-captions", label: "Auto-captions" },
        { href: "/docs/accuracy/ai-transcription", label: "AI transcription" },
      ],
    },
    {
      label: "Export formats",
      pages: [
        { href: "/docs/export-formats", label: "All formats overview" },
        { href: "/docs/export-formats/txt", label: "Plain text (TXT)" },
        { href: "/docs/export-formats/markdown", label: "Markdown" },
        { href: "/docs/export-formats/csv", label: "CSV" },
        { href: "/docs/export-formats/srt", label: "SRT subtitles" },
        { href: "/docs/export-formats/vtt", label: "VTT subtitles" },
        { href: "/docs/export-formats/json", label: "JSON / RAG JSON" },
      ],
    },
    {
      label: "Languages & privacy",
      pages: [
        { href: "/docs/languages", label: "Supported languages" },
        { href: "/docs/privacy-handling", label: "How we handle your data" },
      ],
    },
    {
      label: "How-to guides",
      pages: [
        { href: "/docs/how-to", label: "All how-to guides" },
      ],
    },
    {
      label: "Troubleshooting",
      pages: [
        { href: "/docs/troubleshooting", label: "All troubleshooting" },
      ],
    },
    {
      label: "Reference",
      pages: [
        { href: "/docs/faq", label: "FAQ" },
        { href: "/docs/api", label: "API (coming soon)" },
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
