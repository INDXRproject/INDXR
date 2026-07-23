import type { Metadata } from "next"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { JsonLd } from "@/components/seo/JsonLd"
import { PageHeader } from "@indxr/shared/components/PageHeader"
import { SectionLabel } from "@indxr/shared/components/SectionLabel"
import { ContentCard } from "@/components/content/ContentCard"
import { HexField } from "@/components/content/HexField"
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
      <div className="relative min-h-screen bg-[var(--bg)]">
        {/* Same very-light honeycomb texture as the Library and /articles. */}
        <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />

        <main className="relative container mx-auto px-4 pb-20 max-w-5xl">
          <PageHeader
            eyebrow="Docs"
            title="Documentation"
            lead="Everything you need to get the most out of INDXR — from your first transcript to advanced export and RAG workflows."
          />

          <div className="space-y-14">
            {docsConfig.sections.map((section) => (
              <section key={section.label}>
                <SectionLabel label={section.label} />
                {categoryIntros[section.label] && (
                  <p className="text-sm text-[var(--fg-muted)] -mt-2 mb-5">{categoryIntros[section.label]}</p>
                )}
                <ul className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {section.pages.map((page) => (
                    <li key={page.href}>
                      <ContentCard
                        href={page.href}
                        title={page.label}
                        description={page.description}
                        media={
                          // Docs get no photography — a seeded hexagon tile, deterministic on
                          // the page href, in the same 16:9 box / radius / surface as the article
                          // card image. Same pattern system as the /articles hexagon fallback.
                          <div className="relative aspect-video overflow-hidden bg-[var(--surface-sunken)]">
                            <HexField seed={page.href} color="var(--accent)" />
                          </div>
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
