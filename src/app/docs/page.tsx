import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { JsonLd } from "@/components/seo/JsonLd"
import { DocsHubHero } from "@/components/docs/DocsHubHero"
import { FeaturedDocsGrid } from "@/components/docs/FeaturedDocsGrid"
import { DocsCategorySection } from "@/components/docs/DocsCategorySection"
import { docsConfig } from "@/lib/docs-config"

export const metadata: Metadata = {
  title: "Documentation — INDXR.AI",
  description: "Everything you need to get started with INDXR — from your first transcript to advanced export and RAG workflows.",
  robots: { index: true, follow: true },
}

const categoryIntros: Record<string, string> = {
  "Getting started": "New to INDXR? Start here.",
  "How INDXR works": "Understand extraction, accuracy, credits, and export formats.",
  "Account & data": "Credits, billing, and how your data is handled.",
  "Help": "FAQ, how-to guides, and troubleshooting.",
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
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <DocsHubHero />
          <FeaturedDocsGrid />
          <div className="grid sm:grid-cols-2 gap-8">
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
      <Footer />
    </>
  )
}
