// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"

interface FeaturedDoc {
  label: string
  href: string
  description: string
}

const featuredDocs: FeaturedDoc[] = [
  {
    label: "Quickstart",
    href: "/docs/quickstart",
    description: "Get your first transcript in under 3 minutes.",
  },
  {
    label: "How INDXR works",
    href: "/docs/how-indxr-works",
    description: "A high-level overview of the extraction and transcription pipeline.",
  },
  {
    label: "Credits",
    href: "/docs/account/credits",
    description: "What costs credits, what doesn't, and how refunds work.",
  },
  {
    label: "Export formats",
    href: "/docs/reference/export-formats",
    description: "TXT, Markdown, CSV, SRT, VTT, JSON, and RAG JSON — when to use each.",
  },
]

export function FeaturedDocsGrid() {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-12">
      {featuredDocs.map((doc) => (
        <Link
          key={doc.href}
          href={doc.href}
          className="block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)] transition-colors"
        >
          <p className="font-semibold text-[var(--fg)] mb-1">{doc.label}</p>
          <p className="text-sm text-[var(--fg-muted)]">{doc.description}</p>
        </Link>
      ))}
    </div>
  )
}
