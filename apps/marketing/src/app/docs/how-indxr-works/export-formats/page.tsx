import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsTable } from "@/components/docs/DocsTable"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"

const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export const metadata: Metadata = {
  title: "Export Formats — INDXR.AI Docs",
  description:
    "INDXR exports every transcript in seven formats — plain text, Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON. This page compares them; each format has its own spec page.",
}

export default function DocsExportFormatsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Export Formats",
    description:
      "INDXR exports every transcript in seven formats — plain text, Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON. Comparison and links to each format spec.",
    url: "https://indxr.ai/docs/how-indxr-works/export-formats",
  }

  const linkClass = "text-[var(--accent)] hover:underline"

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Export formats" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Export formats</h1>
        <DefinitionLeadOpening>
          Every transcript exports in seven formats — plain text, Markdown, CSV, SRT, VTT, JSON, and
          RAG-optimized JSON. Six are free and unlimited; only RAG JSON uses credits. This page
          compares them at a glance; each format has its own spec page with the exact fields and a
          real output sample.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Compare the formats</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Format</th>
              <th>File</th>
              <th>Without account</th>
              <th>Cost</th>
              <th>Best for</th>
              <th>Spec</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Plain text</td>
              <td>.txt</td>
              <td>Yes</td>
              <td>Free</td>
              <td>Reading, quick copy</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/txt">TXT</Link></td>
            </tr>
            <tr>
              <td>Markdown</td>
              <td>.md</td>
              <td>No</td>
              <td>Free</td>
              <td>Obsidian, Notion, blogs</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/markdown">Markdown</Link></td>
            </tr>
            <tr>
              <td>CSV</td>
              <td>.csv</td>
              <td>No</td>
              <td>Free</td>
              <td>Spreadsheets, text analysis</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/csv">CSV</Link></td>
            </tr>
            <tr>
              <td>SRT</td>
              <td>.srt</td>
              <td>No</td>
              <td>Free</td>
              <td>Subtitles (editors, players)</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/srt">SRT</Link></td>
            </tr>
            <tr>
              <td>VTT</td>
              <td>.vtt</td>
              <td>No</td>
              <td>Free</td>
              <td>Web video (HTML5)</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/vtt">VTT</Link></td>
            </tr>
            <tr>
              <td>JSON</td>
              <td>.json</td>
              <td>No</td>
              <td>Free</td>
              <td>Your own processing</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/json">JSON</Link></td>
            </tr>
            <tr>
              <td>RAG JSON</td>
              <td>.json</td>
              <td>No</td>
              <td>{ragPer10} credit / 10 min</td>
              <td>Vector databases, RAG</td>
              <td><Link className={linkClass} href="/docs/how-indxr-works/export-formats/json">RAG JSON</Link></td>
            </tr>
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">Notes</AnchorHeading>
        <ul className="list-disc pl-5 space-y-1 text-[var(--fg-subtle)]">
          <li>All formats are available for both caption extraction and AI transcription.</li>
          <li>Plain text is the only format available without an account; the rest need a free account.</li>
          <li>Only <strong>RAG JSON</strong> uses credits ({ragPer10} credit per 10 minutes of transcript); re-downloading a transcript you already exported is free.</li>
        </ul>

        <RelatedTopicsList
          topics={[
            { label: "Plain text (TXT)", href: "/docs/how-indxr-works/export-formats/txt" },
            { label: "Markdown", href: "/docs/how-indxr-works/export-formats/markdown" },
            { label: "JSON / RAG JSON", href: "/docs/how-indxr-works/export-formats/json" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
            { label: "Article: YouTube to text", href: "/articles/youtube-to-text" },
          ]}
        />
      </DocsShell>
    </>
  )
}
