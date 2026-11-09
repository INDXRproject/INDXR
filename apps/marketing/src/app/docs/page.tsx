import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { ContentCard } from "@/components/content/ContentCard"
import { docsConfig } from "@/lib/docs-config"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
  title: "Documentation — INDXR.AI",
  description: "Everything you need to get started with INDXR — from your first transcript to advanced export and RAG workflows.",
  robots: { index: true, follow: true },
  ...pageOg("/docs"),
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
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-[104px] sm:px-6 lg:pt-[120px]">
          {/* Stijl B (2026-11-06): mono label + big title, no page texture. */}
          <header className="mb-14 border-b-2 border-[var(--fg-strong)] pb-10">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">Docs</p>
            <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl">
              Documentation
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--fg-subtle)]">
              How to turn lectures, interviews, podcasts and videos into a searchable library with sources and
              citations, export it anywhere, and ask Claude or ChatGPT about it.
            </p>
          </header>

          <div className="space-y-14">
            {docsConfig.sections.map((section, si) => (
              <section key={section.label}>
                <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">{section.label}</h2>
                {categoryIntros[section.label] && (
                  <p className="text-sm text-[var(--fg-muted)] -mt-2 mb-5">{categoryIntros[section.label]}</p>
                )}
                <ul className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {section.pages.map((page, pi) => (
                    <li key={page.href}>
                      <ContentCard
                        href={page.href}
                        title={page.label}
                        description={page.description}
                        media={
                          // Docs get no photography — a seeded hexagon tile, deterministic on
                          // the page href, in the same 16:9 box / radius / surface as the article
                          // card image. Same pattern system as the /articles hexagon fallback.
                          // Typographic tile (stijl B): section number + page number in ink on paper,
                          // replacing the placeholder hexagon field.
                          <div className="flex aspect-[16/7] flex-col justify-between bg-[var(--bg-subtle)] p-4">
                            <span className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg-subtle)]">{section.label}</span>
                            <span className="text-5xl font-bold tracking-[-0.04em] text-[var(--fg-strong)]">
                              {String(si + 1).padStart(2, "0")}.{String(pi + 1).padStart(2, "0")}
                            </span>
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
