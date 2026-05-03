import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "How Credits Work — INDXR.AI Docs",
  description: "Learn how INDXR.AI credits work — what costs credits, how to buy them, and what never costs credits.",
}

export default function DocsCreditsPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">How Credits Work</h1>
      {/* [KHIDR: vul aan] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
