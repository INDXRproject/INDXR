import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "SRT Subtitles Export — INDXR.AI Docs",
  description: "How to export INDXR.AI transcripts as SRT Subtitles.",
}

export default function DocsExportSrtPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">SRT Subtitles</h1>
      {/* [KHIDR: vul aan] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
