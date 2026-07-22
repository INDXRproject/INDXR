import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Credits — INDXR.AI Docs",
  description: "Learn how credits work in INDXR — what costs credits, the reserve model, why credits never expire, and how refunds work.",
  robots: { index: true, follow: true },
}

export default function DocsCreditsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Credits",
    description: "Learn how credits work in INDXR — what costs credits, the reserve model, why credits never expire, and how refunds work.",
    url: "https://indxr.ai/docs/account/credits",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account", href: "/docs" },
            { label: "Credits" },
          ]}
        />
        <article className="prose prose-neutral max-w-none">
          <h1>Credits</h1>

          {/* KHIDR: schrijf final copy voor credits docs pagina */}
          <p className="lead text-[var(--fg-subtle)]">
            INDXR uses a credit system for AI transcription and AI summarization. Caption extraction is always free.
          </p>

          <h2>How credits work</h2>
          <ul>
            <li><strong>Caption extraction</strong> — 0 credits. Always free, no limits.</li>
            <li><strong>AI transcription</strong> — 1 credit per minute of audio (rounded up, minimum 1).</li>
            <li><strong>AI summarization</strong> — 3 credits per summary.</li>
          </ul>

          <h2>Credits never expire</h2>
          <p>
            Purchased credits stay in your account until you use them.
          </p>

          <h2>Refunds</h2>
          <p>
            If an AI transcription or summarization fails, your credits are automatically refunded. You will see a &quot;Refund&quot; entry in your transaction history on the <a href={appHref('/dashboard/account')}>Account page</a>.
          </p>

          {/* KHIDR: voeg credit transaction history + reserve-model uitleg toe */}
        </article>
        <RelatedTopicsList
          topics={[
            { label: "Billing and invoices", href: "/docs/account/billing" },
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
      </DocsShell>
    </>
  )
}
