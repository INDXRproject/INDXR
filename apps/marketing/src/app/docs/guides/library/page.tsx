import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/library" },
  title: "Your library — INDXR.AI Docs",
  description:
    "Every transcript you make while signed in is saved to your library. You can edit a transcript without losing the original, group transcripts into collections, search by title, delete what you don't need, and see how much space your library uses.",
  robots: { index: true, follow: true },
}

export default function DocsLibraryPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Your library",
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/library",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Library" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Library</h1>
        <DefinitionLeadOpening>
          Your library is where every transcript you make while signed in is saved. It&apos;s the home
          for your work — one place to find, edit, and organise transcripts long after you closed the
          tab you made them in. Anonymous extractions aren&apos;t saved; a free account is what turns a
          one-off download into a library.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Editing keeps the original</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can edit any transcript — fix a name, clean up a passage — and the original is never
          overwritten. INDXR stores your edits separately from the transcript it produced, so there are
          two versions: the original and your edited copy. You can switch between them, and reset back
          to the original at any time.
        </p>

        <AnchorHeading as="h2">Collections group related transcripts</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A collection is a named folder for transcripts that belong together — one course, one
          research project. Each transcript can sit in a collection, and the library can filter to show
          just that collection.
        </p>

        <AnchorHeading as="h2">Search finds a transcript by title</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Search matches on the transcript&apos;s title and its video ID — the string of characters that
          identifies a YouTube video — not the body text. It&apos;s for
          finding the right transcript quickly, not searching inside them — type a few letters of the
          title and the list narrows as you go.
        </p>

        <AnchorHeading as="h2">Deleting, and how much space you use</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Delete a single transcript from its page, or select several in the list and delete them
          together; both ask you to confirm first. A storage meter on your{" "}
          <a className="text-[var(--accent)] hover:underline" href="/docs/account/settings">account page</a>{" "}
          shows how much your saved transcripts add up to, so you can see your library&apos;s footprint at
          a glance.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "original vs edited stored separately; reset to original", verifiedAgainst: "supabase/migrations/20260630155944_baseline.sql:41,52 (transcript / edited_content); apps/app/src/components/library/TranscriptViewer.tsx:440-443,618-647" },
            { publisher: "INDXR (own code)", supports: "collections, search by title/video_id, single + bulk delete", verifiedAgainst: "supabase/migrations/20260630155944_baseline.sql:64-70 (collections); apps/app/src/app/dashboard/library/page.tsx:79-82; apps/app/src/components/library/TranscriptList.tsx:252-264,355-356" },
            { publisher: "INDXR (own code)", supports: "account-page storage meter (real library_bytes)", verifiedAgainst: "apps/app/src/components/dashboard/account/StorageMeterCard.tsx; apps/app/src/app/dashboard/account/page.tsx" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Export formats", href: "/docs/reference/export-formats" },
            { label: "Settings", href: "/docs/account/settings" },
            { label: "What happens to my data", href: "/privacy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
