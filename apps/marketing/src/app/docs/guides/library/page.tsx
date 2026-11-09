import type { Metadata } from "next"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { AskYourLibrary } from "@/components/docs/AskYourLibrary"
import { JsonLd } from "@/components/seo/JsonLd"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/library" },
  title: "Your library — INDXR.AI Docs",
  // 155-char budget (Ahrefs crawl 2026-10-27: was 245 chars). Keyword first.
  description:
    "Every transcript you make while signed in is saved to your library — edit, group into collections, search the text, copy a citation.",
  robots: { index: true, follow: true },
  ...pageOg("/docs/guides/library"),
}

export default function DocsLibraryPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Your library",
    author: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai" },
    publisher: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai", logo: { "@type": "ImageObject", url: "https://indxr.ai/apple-touch-icon.png" } },
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
        <h1 className="text-4xl font-bold leading-[1] tracking-[-0.04em] text-[var(--fg-strong)] mb-5 sm:text-5xl">Library</h1>
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

        <AnchorHeading as="h2">Search looks inside the text</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Search matches titles and the transcript text itself, so you can find a lecture by a sentence
          you remember from it. Combine it with a collection to search one course or project at a time.
        </p>

        <AnchorHeading as="h2">Every transcript keeps its source</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Each transcript page shows where the text came from: the channel, a link to the video, its
          length, word count, language, the date it was published on YouTube, and when you added it. It
          also gives a ready reference in APA style (7th edition), the format most universities accept for
          online video, which you can copy with one click:
        </p>
        <p className="mt-3 border-l-2 border-[var(--fg-strong)] pl-4 font-mono text-sm text-[var(--fg)]">
          Harvard University. (2009, September 4). Justice: What&apos;s The Right Thing To Do? Episode 01
          &quot;THE MORAL SIDE OF MURDER&quot; [Video]. YouTube. https://youtu.be/kBdfcR-8hEY
        </p>
        <p className="mt-3 text-[var(--fg-subtle)] leading-relaxed">
          The publication date is looked up on YouTube the first time you open a transcript. When there is
          none (your own uploads, or a video that has since been removed), the reference says
          &quot;n.d.&quot;, which is how APA writes a source without a date. For your own files the reference
          uses the title and marks it as an audio recording; check the author before you use it in a paper.
          The title is copied exactly as it appears on YouTube. Pasting into a word processor or notes app
          italicises the title automatically, as APA requires — but still check its capitalisation: APA
          writes titles in sentence case, and INDXR doesn&apos;t rewrite the title itself (an automatic
          lowercase pass would break proper nouns).
        </p>

        <AnchorHeading as="h2">Deleting, and how much space you use</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Delete a single transcript from its page, or select several in the list and delete them
          together; both ask you to confirm first. A storage meter on your{" "}
          <a className="text-[var(--link)] hover:underline" href={appHref("/dashboard/account")}>account page</a>{" "}
          shows how much your saved transcripts add up to, so you can see your library&apos;s footprint at
          a glance.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "original vs edited stored separately; reset to original", verifiedAgainst: "supabase/migrations/20260630155944_baseline.sql:41,52 (transcript / edited_content); apps/app/src/components/library/TranscriptViewer.tsx:440-443,618-647" },
            { publisher: "INDXR (own code)", supports: "collections, title + full-text search, single + bulk delete", verifiedAgainst: "supabase/migrations/20260630155944_baseline.sql:64-70 (collections); apps/app/src/app/dashboard/library/page.tsx; apps/app/src/components/library/TranscriptList.tsx" },
            { publisher: "INDXR (own code)", supports: "source card, APA 7 reference, publication date lookup", verifiedAgainst: "apps/app/src/components/library/SourceCard.tsx (buildCitation); apps/app/src/app/api/transcripts/[id]/published-at/route.ts" },
            { publisher: "INDXR (own code)", supports: "account-page storage meter (real library_bytes)", verifiedAgainst: "apps/app/src/components/dashboard/account/StorageMeterCard.tsx; apps/app/src/app/dashboard/account/page.tsx" },
          ]}
        />
        <AskYourLibrary lead="Your library keeps every transcript with its source and a citation, searchable in the text itself." />

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
