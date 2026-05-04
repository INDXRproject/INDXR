import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"

export const metadata: Metadata = {
  title: "Troubleshooting — INDXR.AI Docs",
  description: "Solutions to common issues when extracting or transcribing YouTube videos.",
}

export default function DocsTroubleshootingPage() {
  return (
    <>
      <DocsShell>
        <DocsBreadcrumb items={[{ label: "Docs", href: "/docs" }, { label: "Help", href: "/docs/help/faq" }, { label: "Troubleshooting" }]} />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Troubleshooting</h1>
        <p className="text-[var(--fg-muted)] mb-6">Solutions to common issues when extracting or transcribing YouTube videos.</p>
        <p className="text-sm text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[var(--radius)] px-4 py-8 text-center">
          Troubleshooting guides coming soon — check back as we add content.
        </p>
      </DocsShell>
      <Footer />
    </>
  )
}
