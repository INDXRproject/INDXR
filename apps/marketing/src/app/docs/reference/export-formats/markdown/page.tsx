import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Markdown Export — INDXR.AI Docs",
  description:
    "INDXR exports transcripts as Markdown with a YAML frontmatter block (title, url, channel, published, duration, language, transcript_source, created, type, tags) and optional timestamp headings that deep-link back to the video.",
}

// Real output of generateMarkdown(..., { includeYamlFrontmatter: true }) with timestamps
// (packages/shared/src/utils/formatTranscript.ts). Body truncated with an ellipsis.
const mdSample = `---
title: "Vector Databases Explained"
url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
channel: "AI Foundations"
published: "2026-06-01"
duration: 31
language: "en"
transcript_source: "AI Transcription (AssemblyAI)"
created: "2026-07-22"
type: youtube
tags: [youtube, transcript]
---

# Vector Databases Explained

## [00:00:00](https://youtu.be/dQw4w9WgXcQ?t=0)
Welcome to this short introduction to vector databases. A vector database stores embeddings and retrieves them by similarity. …`

export default function DocsMarkdownPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Markdown export",
    description: metadata.description,
    url: "https://indxr.ai/docs/reference/export-formats/markdown",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/reference/export-formats" },
            { label: "Markdown" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Markdown</h1>
        <DefinitionLeadOpening>
          The Markdown export is a <code>.md</code> file: an optional YAML frontmatter block with the
          video&apos;s metadata, an <code>H1</code> title, then the transcript as paragraphs — or, with
          timestamps on, sections headed by a clickable timestamp that deep-links back to the video. It
          drops straight into Obsidian, Notion or Logseq and stays linked to its source.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Frontmatter keys</AnchorHeading>
        <DocsTable>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>title</code></td><td>Video title (quoted)</td></tr>
            <tr><td><code>url</code></td><td><code>https://www.youtube.com/watch?v=&lt;id&gt;</code></td></tr>
            <tr><td><code>channel</code></td><td>Channel name</td></tr>
            <tr><td><code>published</code></td><td>Upload date</td></tr>
            <tr><td><code>duration</code></td><td>Seconds (number)</td></tr>
            <tr><td><code>language</code></td><td>Detected language code</td></tr>
            <tr><td><code>transcript_source</code></td><td>&quot;AI Transcription (AssemblyAI)&quot; or &quot;Auto-captions (YouTube)&quot;</td></tr>
            <tr><td><code>created</code></td><td>Export date (YYYY-MM-DD)</td></tr>
            <tr><td><code>type</code></td><td>Always <code>youtube</code></td></tr>
            <tr><td><code>tags</code></td><td><code>[youtube, transcript]</code></td></tr>
          </tbody>
        </DocsTable>
        <p className="text-[var(--fg-muted)] text-sm">Fields with no value (e.g. a missing channel) are omitted rather than left empty.</p>

        <AnchorHeading as="h2">Output</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          With timestamps on, a new <code>## [HH:MM:SS](youtu.be/&lt;id&gt;?t=N)</code> heading starts
          wherever there is a gap of more than 5 seconds between segments.
        </p>
        <DocsCodeBlock>{mdSample}</DocsCodeBlock>

        <DocsFigure
          alt="An exported Markdown transcript rendered in Obsidian, showing the YAML frontmatter block above the transcript body"
          caption="How the Markdown export renders in Obsidian — frontmatter properties above the linked transcript."
        />

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "frontmatter keys, timestamp-heading format, paragraph split", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateMarkdown, buildYamlFrontmatter)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/reference/export-formats" },
            { label: "Plain text (TXT)", href: "/docs/reference/export-formats/txt" },
            { label: "Article: YouTube transcript to Markdown", href: "/articles/youtube-transcript-markdown" },
            { label: "Article: Obsidian workflow", href: "/articles/youtube-transcript-obsidian" },
          ]}
        />
      </DocsShell>
    </>
  )
}
