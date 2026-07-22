import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Settings — INDXR.AI Docs",
  description:
    "Your settings cover export and interface preferences, the default RAG chunk size (30, 60, 90 or 120 seconds, default 60), email preferences, and deleting your account — see the privacy policy for what happens to your data.",
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
          Settings is where you control your preferences: the default RAG chunk size (30, 60, 90 or
          120 seconds — 60 by default), your email preferences, and deleting your account. For what
          happens to your data when you delete your account, see the{" "}
          <a className="text-[var(--accent)] hover:underline" href="/privacy">privacy policy</a>.
        </DefinitionLeadOpening>
        <RelatedTopicsList
          topics={[
            { label: "JSON & RAG JSON", href: "/docs/how-indxr-works/export-formats/json" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "What happens to my data", href: "/privacy" },
          ]}
        />
      </DocsShell>
    </>
  )
}
