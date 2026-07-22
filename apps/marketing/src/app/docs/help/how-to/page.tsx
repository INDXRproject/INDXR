import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"

export const metadata: Metadata = {
  title: "How-To Guides — INDXR.AI Docs",
  description: "Step-by-step guides for common INDXR workflows.",
}

export default function DocsHowToPage() {
  return (
    <>
      <DocsShell>
        <DocsBreadcrumb items={[{ label: "Docs", href: "/docs" }, { label: "Help", href: "/docs/help/faq" }, { label: "How-to guides" }]} />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How-To Guides</h1>
        <p className="text-[var(--fg-muted)] mb-6">Step-by-step guides for common INDXR workflows.</p>
        <p className="text-sm text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[var(--radius)] px-4 py-8 text-center">
          Guides coming soon — check back as we add content.
        </p>
      </DocsShell>
    </>
  )
}
