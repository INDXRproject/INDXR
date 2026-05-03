import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "Privacy & Data Handling — INDXR.AI Docs",
  description: "How INDXR.AI handles your data — what we store, what we don't, and how to delete your data.",
}

export default function DocsPrivacyHandlingPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Privacy & Data Handling</h1>
      {/* [KHIDR: vul aan — wat bewaren we, R2 audio retention, transcripts, credit history, hoe te verwijderen] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
