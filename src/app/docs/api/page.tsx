import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import Link from "next/link"

export const metadata: Metadata = {
  title: "API — INDXR.AI Docs",
  description: "INDXR.AI API documentation — coming soon.",
  robots: { index: false },
}

export default function DocsApiPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">API</h1>
      <p className="text-[var(--fg-muted)] mb-4">
        A public REST API is not available yet. INDXR.AI currently operates as a web UI only.
      </p>
      <p className="text-[var(--fg-muted)] text-sm">
        Interested in API access? <Link href="/contact" className="text-[var(--accent)] hover:underline">Let us know</Link>.
      </p>
      {/* [KHIDR: vul aan als API beschikbaar is] */}
    </DocsShell>
  )
}
