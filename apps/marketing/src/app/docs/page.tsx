import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { DocsHubHero } from "@/components/docs/DocsHubHero"
import { DocsCategorySection } from "@/components/docs/DocsCategorySection"
import { docsConfig } from "@/lib/docs-config"

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
  title: "Documentation — INDXR.AI",
  description: "Everything you need to get started with INDXR — from your first transcript to advanced export and RAG workflows.",
  robots: { index: true, follow: true },
}

const categoryIntros: Record<string, string> = {
  "Getting started": "New to INDXR? Learn what it does and get your first transcript.",
  "Guides": "Step-by-step for each way of getting a transcript.",
  "Reference": "Formats, accuracy, and limits — the exact details.",
  "Account": "Credits, billing, and your settings.",
}

const collectionPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "INDXR.AI Documentation",
  description: "Product documentation for INDXR — YouTube transcript extraction and AI transcription.",
  url: "https://indxr.ai/docs",
}

export default function DocsPage() {
  return (
    <>
      <JsonLd schemas={[collectionPageSchema]} />
      {/* pt-16 clears the fixed marketing header (h-16), matching DocsShell — without it the
          hub H1 renders under the header (the bug that was already fixed on the docs pages). */}
      <div className="min-h-screen bg-[var(--bg)] pt-16">
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <DocsHubHero />
          {/* CSS multi-column (not a 2-col grid): blocks flow and balance by height so the
              short categories don't leave a gap beside the tall one. break-inside-avoid on each
              section keeps a block intact within one column. */}
          <div className="columns-1 sm:columns-2 gap-8">
            {docsConfig.sections.map((section) => (
              <DocsCategorySection
                key={section.label}
                section={section}
                intro={categoryIntros[section.label]}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
