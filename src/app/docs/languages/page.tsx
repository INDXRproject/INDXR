import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "Supported Languages — INDXR.AI Docs",
  description: "Languages supported by INDXR.AI auto-caption extraction and AI transcription.",
}

export default function DocsLanguagesPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Supported Languages</h1>
      {/* [KHIDR: vul aan — YouTube captions: 67 talen; AssemblyAI Universal-3: 99+ talen met auto-detectie] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
