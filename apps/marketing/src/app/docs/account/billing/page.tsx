import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Billing and Invoices — INDXR.AI Docs",
  description: "How to buy credits, find your invoices and purchase history, and which countries we can sell to under our VAT registration.",
  robots: { index: true, follow: true },
}

export default function DocsBillingPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Billing and invoices",
    description: "How to buy credits, find your invoices and purchase history, and which countries we can sell to under our VAT registration.",
    url: "https://indxr.ai/docs/account/billing",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account", href: "/docs" },
            { label: "Billing and invoices" },
          ]}
        />
        <article className="prose prose-neutral max-w-none">
          <h1>Billing and invoices</h1>

          {/* KHIDR: schrijf final copy voor billing docs pagina */}
          <p className="lead text-[var(--fg-subtle)]">
            Credits are bought in one-time packages — there are no subscriptions. Your invoices and purchase history are on your Account page.
          </p>

          <h2>Buying credits</h2>
          <p>
            Credits are purchased in one-time packages — no subscriptions. See the <a href="/pricing">pricing page</a> for current packages.
          </p>

          <h2>Where you can buy</h2>
          <p>
            We&apos;re VAT-registered in the Netherlands and through the EU&apos;s One Stop Shop, which covers the EU. A few countries — including the UK and Switzerland — require a separate local VAT registration from the very first sale, with no minimum. Until we do that properly, we&apos;d rather not sell to you than sell to you incorrectly. If you want access from your country, <a href="/contact">email us</a> — enough interest and we&apos;ll register.
          </p>

          {/* KHIDR: voeg invoice/aankoophistorie uitleg toe */}
        </article>
        <RelatedTopicsList
          topics={[
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
      </DocsShell>
    </>
  )
}
