import type { Metadata } from "next"
import Link from "next/link"
import { docsConfig } from "@/lib/docs-config"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Documentation — INDXR.AI",
  description: "Everything you need to get started with INDXR — from your first transcript to advanced workflows.",
  robots: { index: true, follow: true },
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-[var(--fg)] mb-3">Documentation</h1>
          {/* KHIDR: intro copy voor docs landing */}
          <p className="text-[var(--fg-subtle)] text-lg max-w-2xl">
            Everything you need to get the most out of INDXR — from your first transcript to advanced export workflows.
          </p>
        </div>

        {/* Sections grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {docsConfig.sections.map((section) => (
            <div key={section.label} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-base font-semibold text-[var(--fg)] mb-4">{section.label}</h2>
              <ul className="space-y-2">
                {section.pages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
