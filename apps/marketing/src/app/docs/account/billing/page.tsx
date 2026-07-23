import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"

const description =
  "You buy credits in one-time packages — there are no subscriptions. Stripe handles the payment and issues a proper VAT invoice, and your invoices and purchase history live on your Account page. A few countries can't buy yet because of how VAT registration works."

export const metadata: Metadata = {
  alternates: { canonical: "/docs/account/billing" },
  title: "Billing and Invoices — INDXR.AI Docs",
  description,
  robots: { index: true, follow: true },
}

export default function DocsBillingPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Billing and invoices",
    description,
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
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Billing and invoices</h1>
        <DefinitionLeadOpening>
          You buy credits in one-time packages — there are no subscriptions and nothing recurring. Stripe,
          our payment processor, handles the payment and issues a proper VAT invoice — VAT being the sales
          tax built into EU prices. Your invoices and purchase history live on your Account page. A few
          countries can&apos;t buy yet, because of how VAT registration works.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Buying credits</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Credits come in one-time packages — you pay once and the credits are added to your balance.
          There is no subscription and nothing to cancel. Prices are shown on the{" "}
          <a href="/pricing" className="text-[var(--accent)] hover:underline">pricing page</a>, VAT
          included, and payment runs through Stripe&apos;s secure checkout — no card details ever touch
          our servers. Credits appear on your balance within about a minute of a successful payment.
        </p>

        <AnchorHeading as="h2">Invoices and purchase history</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Every purchase gets a VAT invoice from Stripe, suitable for expensing or reclaiming VAT where
          you&apos;re entitled to. You&apos;ll find your invoices and full purchase history on your{" "}
          <a href={appHref("/dashboard/account")} className="text-[var(--accent)] hover:underline">Account page</a>,
          alongside your credit transaction history. Refunds on a purchase are covered in the{" "}
          <a href="/terms" className="text-[var(--accent)] hover:underline">Terms</a>.
        </p>

        <AnchorHeading as="h2">Where you can buy</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          We&apos;re VAT-registered in the Netherlands and through the EU&apos;s One Stop Shop — a scheme
          that lets one registration cover the VAT for every EU country. A few countries — including the UK
          and Switzerland — require a separate local VAT registration from the very first sale, with no
          minimum. Until we do that properly, we&apos;d
          rather not sell to you than sell to you incorrectly. If you want access from your country,{" "}
          <a href="/contact" className="text-[var(--accent)] hover:underline">email us</a> — enough
          interest and we&apos;ll register.
        </p>

        <SourcesBlock
          sources={[
            {
              publisher: "INDXR (own code + policy)",
              supports: "one-time packages via Stripe Checkout, VAT-inclusive prices, invoices/history on the Account page, and the VAT country scope (NL + EU One Stop Shop; UK/CH blocked until local registration)",
              verifiedAgainst: "apps/app/src/app/api/stripe/checkout/route.ts; packages/shared/src/lib/pricing.ts (PACKAGES); docs/wiki/decisions/062-market-scope-and-country-guard.md",
            },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Pricing", href: "/pricing" },
            { label: "Terms", href: "/terms" },
          ]}
        />
      </DocsShell>
    </>
  )
}
