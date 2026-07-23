import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsTable } from "@/components/docs/DocsTable"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/account/settings" },
  title: "Settings — INDXR.AI Docs",
  description:
    "Your settings cover the theme, email preferences, how many transcripts show per library page, the default RAG chunk size (30, 60, 90 or 120 seconds, default 60), and deleting your account. Each setting and its options, explained.",
  robots: { index: true, follow: true },
}

export default function DocsSettingsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Settings",
    description: metadata.description,
    url: "https://indxr.ai/docs/account/settings",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account", href: "/docs" },
            { label: "Settings" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Settings</h1>
        <DefinitionLeadOpening>
          Settings is where you adjust how INDXR looks and behaves for you. Most of it you can leave on
          the defaults; the two worth knowing about are the RAG chunk size — which only matters if you
          export transcripts for AI-powered search — and account deletion. Each setting is described below
          with its options.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Email preferences</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Two independent switches control what lands in your inbox. <strong>Email me about replies and
          messages</strong> covers replies to your support messages and is on by default.{" "}
          <strong>Marketing &amp; product emails</strong> covers product news; you&apos;re subscribed
          by default and can opt out here.
        </p>

        <AnchorHeading as="h2">Library page size</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          This sets how many transcripts show on one page of your library — 25, 50 or 100, with 50 as
          the default. Higher means less clicking through pages; lower means a lighter page.
        </p>

        <AnchorHeading as="h2">RAG chunk size</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          This is the default length of the chunks in a RAG JSON export. RAG (retrieval-augmented
          generation) is the technique of feeding an AI only the most relevant snippets of a text, and
          chunks are the pieces a transcript is split into so a vector database — a store that finds text
          by meaning rather than by exact words — can look them up. Shorter chunks are tighter and better
          for pulling exact quotes; longer chunks keep more surrounding context per piece. The default is
          60 seconds, and you can override it per export.
        </p>
        <DocsTable>
          <thead>
            <tr>
              <th>Preset</th>
              <th>Chunk length</th>
              <th>Approx. tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Quote</td><td>30s</td><td>~100 tokens</td></tr>
            <tr><td>Balanced (default)</td><td>60s</td><td>~200 tokens</td></tr>
            <tr><td>Precise</td><td>90s</td><td>~300 tokens</td></tr>
            <tr><td>Context</td><td>120s</td><td>~390 tokens</td></tr>
          </tbody>
        </DocsTable>
        <p className="text-[var(--fg-muted)] text-sm">
          See <a className="text-[var(--accent)] hover:underline" href="/docs/reference/export-formats/json">JSON &amp; RAG JSON</a> for what the chunks look like.
        </p>

        <AnchorHeading as="h2">Deleting your account</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The danger zone deletes your account and everything in it — transcripts, credits, summaries,
          history — and can&apos;t be undone. You type <code>DELETE</code> to confirm. For exactly what
          is removed and what happens to your data, see the{" "}
          <a className="text-[var(--accent)] hover:underline" href="/privacy">privacy policy</a>.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "settings list, email toggles, page-size options and defaults", verifiedAgainst: "apps/app/src/app/dashboard/settings/page.tsx:17-26,52-76; apps/app/src/components/dashboard/settings/LibraryPageSizeSelect.tsx:8" },
            { publisher: "INDXR (own code)", supports: "RAG chunk-size presets (30/60/90/120s, default 60) and token estimates", verifiedAgainst: "apps/app/src/components/dashboard/settings/DeveloperExportsCard.tsx:8,14-19" },
            { publisher: "INDXR (own code)", supports: "account deletion (type DELETE, cascade removal)", verifiedAgainst: "apps/app/src/components/dashboard/settings/DeleteAccountCard.tsx:56-98; apps/app/src/app/api/account/delete/route.ts:7-22" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "JSON & RAG JSON", href: "/docs/reference/export-formats/json" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "What happens to my data", href: "/privacy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
