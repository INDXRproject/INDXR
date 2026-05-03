import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "Usage Limits — INDXR.AI Docs",
  description: "INDXR.AI usage limits — file size, playlist size, rate limits, and more.",
}

export default function DocsLimitsPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Usage Limits</h1>
      {/* [KHIDR: vul aan — audio file max 500MB, playlist max ~100 videos, rate limits, etc.] */}
      <p className="text-[var(--fg-muted)]">Coming soon — this page is being written.</p>
    </DocsShell>
  )
}
