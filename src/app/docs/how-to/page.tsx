import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "How-To Guides — INDXR.AI Docs",
  description: "Step-by-step guides for common INDXR.AI workflows.",
}

export default function DocsHowToPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How-To Guides</h1>
      <p className="text-[var(--fg-muted)]">
        {/* [KHIDR: vul aan — lijst van how-to guides als die beschikbaar zijn] */}
        Step-by-step guides are coming soon.
      </p>
    </DocsShell>
  )
}
