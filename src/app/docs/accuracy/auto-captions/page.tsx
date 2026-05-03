import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "Auto-Caption Accuracy — INDXR.AI Docs",
  description: "How accurate are YouTube auto-captions extracted by INDXR.AI?",
}

export default function DocsAutoCaptionsPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Auto-Caption Accuracy</h1>
      {/* [KHIDR: vul aan] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
