import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Transcription Accuracy — INDXR.AI Docs",
  description: "Understand the accuracy of INDXR.AI auto-captions and AI transcription.",
}

export default function DocsAccuracyPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Transcription Accuracy</h1>
      {/* [KHIDR: vul aan — overzicht van caption accuracy vs AI transcription accuracy] */}
      <ul className="space-y-2 mt-4">
        <li><Link href="/docs/accuracy/auto-captions" className="text-[var(--accent)] hover:underline">Auto-captions accuracy</Link></li>
        <li><Link href="/docs/accuracy/ai-transcription" className="text-[var(--accent)] hover:underline">AI transcription accuracy</Link></li>
      </ul>
    </DocsShell>
  )
}
