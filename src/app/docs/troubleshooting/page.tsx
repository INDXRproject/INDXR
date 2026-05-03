import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Troubleshooting — INDXR.AI Docs",
  description: "Troubleshoot common issues with INDXR.AI transcript extraction and transcription.",
}

export default function DocsTroubleshootingPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Troubleshooting</h1>
      <p className="text-[var(--fg-muted)] mb-6">
        Common issues and solutions. Also see our{" "}
        <Link href="/articles" className="text-[var(--accent)] hover:underline">articles</Link>{" "}
        for in-depth guides.
      </p>
      {/* [KHIDR: vul aan — lijst van troubleshooting guides als die beschikbaar zijn] */}
      <p className="text-[var(--fg-muted)] text-sm">Troubleshooting guides coming soon.</p>
    </DocsShell>
  )
}
