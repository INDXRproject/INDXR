import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Plain Text (TXT) Export — INDXR.AI Docs",
  description:
    "INDXR exports a transcript as plain text in two variants: continuous paragraphs, or one line per segment prefixed with an HH:MM:SS timestamp. TXT is the only format available without an account.",
}

// Real output of generateTxt() (packages/shared/src/utils/formatTranscript.ts).
const paragraphSample = `Welcome to this short introduction to vector databases.

A vector database stores embeddings and retrieves them by similarity.

That makes it the backbone of most retrieval augmented generation systems.`

const timestampSample = `00:00:00  Welcome to this short introduction to vector databases.
00:00:03  A vector database stores embeddings and retrieves them by similarity.
00:00:07  That makes it the backbone of most retrieval augmented generation systems.`

export default function DocsTxtPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Plain text (TXT) export",
    description: metadata.description,
    url: "https://indxr.ai/docs/how-indxr-works/export-formats/txt",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Plain text (TXT)" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Plain text (TXT)</h1>
        <DefinitionLeadOpening>
          The TXT export gives you the transcript as plain text in two variants: continuous
          paragraphs, or one line per segment prefixed with an <code>HH:MM:SS</code> timestamp. It is
          the only format available without an account.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Without timestamps (paragraphs)</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Segments are merged into paragraphs. A new paragraph starts when there is a gap of more than
          2 seconds between segments, when a paragraph passes about 90 seconds, or when the previous
          segment ends on <code>.</code>, <code>!</code> or <code>?</code>.
        </p>
        <DocsCodeBlock>{paragraphSample}</DocsCodeBlock>

        <AnchorHeading as="h2">With timestamps</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Each segment is one line: an <code>HH:MM:SS</code> timestamp of the segment&apos;s start,
          then two spaces, then the text.
        </p>
        <DocsCodeBlock>{timestampSample}</DocsCodeBlock>

        <AnchorHeading as="h2">Availability</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          TXT (both variants) is the only export you can download — or copy — without an account. The
          other six formats need a free account.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "TXT paragraph rules, timestamp format", verifiedAgainst: "packages/shared/src/utils/formatTranscript.ts (generateTxt, createParagraphMode)" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "All export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Markdown", href: "/docs/how-indxr-works/export-formats/markdown" },
            { label: "Article: YouTube to text", href: "/articles/youtube-to-text" },
          ]}
        />
      </DocsShell>
    </>
  )
}
