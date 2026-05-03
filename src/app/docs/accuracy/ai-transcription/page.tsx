import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "AI Transcription Accuracy — INDXR.AI Docs",
  description: "How accurate is INDXR.AI AI transcription powered by AssemblyAI Universal-3?",
}

export default function DocsAiTranscriptionPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">AI Transcription Accuracy</h1>
      {/* [KHIDR: vul aan] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
