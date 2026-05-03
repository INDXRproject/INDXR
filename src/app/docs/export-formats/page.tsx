import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Export Formats — INDXR.AI Docs",
  description: "All export formats supported by INDXR.AI: TXT, Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON.",
}

const formats = [
  { href: "/docs/export-formats/txt", label: "Plain text (TXT)" },
  { href: "/docs/export-formats/markdown", label: "Markdown" },
  { href: "/docs/export-formats/csv", label: "CSV" },
  { href: "/docs/export-formats/srt", label: "SRT subtitles" },
  { href: "/docs/export-formats/vtt", label: "VTT subtitles" },
  { href: "/docs/export-formats/json", label: "JSON / RAG-optimized JSON" },
]

export default function DocsExportFormatsPage() {
  return (
    <DocsShell>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Export Formats</h1>
      <p className="text-[var(--fg-muted)] mb-6">
        {/* [KHIDR: vul aan — kort overzicht van alle formaten en wanneer je welk gebruikt] */}
        INDXR.AI supports multiple export formats for different use cases.
      </p>
      <ul className="space-y-2">
        {formats.map((f) => (
          <li key={f.href}>
            <Link href={f.href} className="text-[var(--accent)] hover:underline">{f.label}</Link>
          </li>
        ))}
      </ul>
    </DocsShell>
  )
}
