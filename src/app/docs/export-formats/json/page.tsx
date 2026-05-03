import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "JSON / RAG-Optimized JSON Export — INDXR.AI Docs",
  description: "How to export INDXR.AI transcripts as JSON / RAG-Optimized JSON.",
}

export default function DocsExportJsonPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">JSON / RAG-Optimized JSON</h1>
      {/* [KHIDR: vul aan] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
