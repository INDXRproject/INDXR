import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"

// Internal scaffolding reference for the docs components — not user-facing content.
// Kept noindex and out of the sidebar/sitemap so it never ships as a real doc.
export const metadata: Metadata = {
  title: "Docs component preview (internal)",
  robots: { index: false, follow: false },
}

export default function DocsComponentPreviewPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb
        items={[
          { label: "Docs", href: "/docs" },
          { label: "Component preview" },
        ]}
      />
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Docs component preview</h1>
      <DefinitionLeadOpening>
        Internal reference showing the docs-shell building blocks so the writing round knows the
        vessel content lands in. Not linked from navigation and excluded from search.
      </DefinitionLeadOpening>

      <AnchorHeading as="h2">Callouts</AnchorHeading>
      <DocsCallout variant="costs-credits">
        AI transcription uses credits — 1 credit per minute of audio.
      </DocsCallout>
      <DocsCallout variant="careful">
        Regenerating a summary overwrites the previous one.
      </DocsCallout>
      <DocsCallout variant="requires-account">
        Playlists, uploads and the library need a free account.
      </DocsCallout>

      <AnchorHeading as="h2">Figure</AnchorHeading>
      <DocsFigure
        alt="CSV export opened in a spreadsheet showing one row per transcript segment"
        caption="How the CSV export lands in a spreadsheet — one row per segment."
      />

      <AnchorHeading as="h2">Table (mobile scroll)</AnchorHeading>
      <DocsTable>
        <thead>
          <tr>
            <th>Format</th>
            <th>Extension</th>
            <th>Timestamps</th>
            <th>Anonymous</th>
            <th>Cost</th>
            <th>Typical use</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Plain text</td><td>.txt</td><td>Optional</td><td>Yes</td><td>Free</td><td>Reading, quick copy</td></tr>
          <tr><td>Markdown</td><td>.md</td><td>Optional</td><td>No</td><td>Free</td><td>Obsidian, Notion, Logseq</td></tr>
          <tr><td>CSV</td><td>.csv</td><td>Yes</td><td>No</td><td>Free</td><td>Spreadsheets, analysis</td></tr>
          <tr><td>RAG JSON</td><td>.json</td><td>Yes</td><td>No</td><td>1 cr / 10 min</td><td>Vector databases</td></tr>
        </tbody>
      </DocsTable>

      <AnchorHeading as="h2">Code block (mobile scroll)</AnchorHeading>
      <DocsCodeBlock>{`{ "chunk": 1, "start": 0.0, "end": 92.4, "token_count": 340, "deep_link": "https://youtu.be/VIDEO_ID?t=0", "text": "A long single line that must scroll horizontally on narrow screens instead of overflowing the viewport ..." }`}</DocsCodeBlock>

      <AnchorHeading as="h2">Sources</AnchorHeading>
      <p className="text-[var(--fg-subtle)] leading-relaxed">The SourcesBlock renders below, above RelatedTopicsList.</p>

      <SourcesBlock
        sources={[
          { publisher: "AssemblyAI", supports: "supported languages and WER accuracy tiers", href: "https://www.assemblyai.com/docs/supported-languages" },
          { publisher: "INDXR (own code)", supports: "export format fields", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts" },
        ]}
      />

      <RelatedTopicsList
        topics={[
          { label: "Overview", href: "/docs/how-indxr-works" },
          { label: "Export formats", href: "/docs/reference/export-formats" },
        ]}
      />
    </DocsShell>
  )
}
