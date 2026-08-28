import type { Metadata } from "next"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { uploadFormatsProse, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { JsonLd } from "@/components/seo/JsonLd"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { PricingHero } from "@/components/pricing/PricingHero"
import { PricingTiers } from "@indxr/shared/components/pricing/PricingTiers"
import { BuyButton } from "@/components/pricing/BuyButton"
import { CreditCostTable } from "@/components/pricing/CreditCostTable"
import { TrustRowCards } from "@/components/pricing/TrustRowCards"
import { VatLine } from "@/components/pricing/VatLine"
import { PACKAGES, tierPriceCredits } from "@indxr/shared/lib/pricing"

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — INDXR.AI",
  description: `YouTube transcript extraction and AI transcription credits. Starting at €${PACKAGES[0].priceEur.toFixed(2)} — pay-per-use, no subscription, VAT included. Credits never expire.`,
}

const faqItems: FAQItem[] = [
  {
    question: "Do credits expire?",
    answer: "Never. Buy when you want, use when you're ready. There's no time limit.",
  },
  {
    question: "Do I need an account to get started?",
    answer: "No. Extracting a single video with YouTube captions is free without an account. A free account gives you 25 welcome credits and unlocks all export formats.",
  },
  {
    question: "What happens when I run out of credits?",
    answer: "You can purchase a new package. Your library and all previously extracted transcripts remain available — nothing is deleted when your credit balance reaches zero.",
  },
  {
    question: "What if I need fewer credits than Starter?",
    answer: `The Try package (${tierPriceCredits("try")}) is available for a single project or a quick test.`,
  },
  {
    question: "Does INDXR.AI work for audio files, not just YouTube?",
    answer: `Yes. The Upload tab accepts ${uploadFormatsProse("and")} files up to ${UPLOAD_MAX_FILE_MB}MB. Same AI transcription pipeline, same credit cost (1 credit per minute), same export options.`,
  },
  {
    question: "Is RAG JSON export included in the standard price?",
    answer: "RAG JSON export costs 1 credit per 10 minutes of video (minimum 1 credit) on top of extraction costs. Re-downloading a transcript you've already exported to RAG JSON is free.",
  },
  {
    question: "Can I get a refund?",
    answer: "Yes, under your 14-day right of withdrawal: if you haven't used any credit from a purchase, you can request a full refund within 14 days. Once you use a credit from that purchase — by generating a transcript — it becomes non-refundable, but your credits never expire, so their value stays yours. If a transcription fails on our side, those credits are returned automatically. Full terms are in our Terms of Service.",
  },
  {
    question: "How is VAT handled?",
    answer: "All prices include VAT. Stripe applies the correct VAT rate for your country at checkout.",
  },
  {
    question: "Can I get an invoice for business use?",
    answer: "Yes. Your account's purchase history has a Download invoice button for every purchase — a proper VAT invoice, generated on demand when you click it. Nothing is emailed automatically; you download it whenever you need it.",
  },
  {
    question: "Which countries can buy credits?",
    answer: "Most of them. Payment isn't available in a few countries yet, where we can't currently meet local requirements — in those, checkout is declined before any charge, so you're never billed. If that happens to you, email support@indxr.ai and we'll help.",
  },
  {
    question: "What payment methods are supported?",
    answer: "Whatever Stripe offers at your checkout — cards, plus the local payment methods Stripe supports in your country. You'll see the available options on the payment screen.",
  },
]

// AggregateOffer schema derived from PACKAGES (single source of truth)
const aggregateOfferSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "INDXR.AI Transcript Credits",
  description: "Pay-per-use YouTube transcript extraction and AI transcription credits. No subscription, credits never expire.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "EUR",
    lowPrice: Math.min(...PACKAGES.map((p) => p.priceEur)),
    highPrice: Math.max(...PACKAGES.map((p) => p.priceEur)),
    offerCount: PACKAGES.length,
    offers: PACKAGES.map((pkg) => ({
      "@type": "Offer",
      name: `${pkg.name} Package`,
      price: pkg.priceEur,
      priceCurrency: "EUR",
      description: `${pkg.credits} transcript credits. ${pkg.audience}`,
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-01-01",
    })),
  },
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.slice(0, 7).map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export default function PricingPage() {
  return (
    <>
      <JsonLd schemas={[aggregateOfferSchema, faqSchema]} />

      <div className="relative min-h-screen bg-[var(--bg)]">
        {/* Same very-light honeycomb texture as /articles and /docs. */}
        <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
        <div className="relative container px-4 sm:px-6 lg:px-8 mx-auto pb-24">

          {/* Section 2 — Hero */}
          <PricingHero />

          {/* Section 4+5 — 3 main tier cards (Starter / Plus★ / Power) + Try secondary strip.
              Gedeelde presentatie met app-billing; CTA = auth-aware marketing BuyButton. */}
          <PricingTiers
            renderCta={(pkg, opts) => (
              <BuyButton pkg={pkg} featured={pkg.mostPopular} compact={opts?.compact} />
            )}
          />

          {/* Section 6 — Credit-cost table with tier toggle */}
          <CreditCostTable />

          {/* Section 7 — Trust row */}
          <TrustRowCards />

          {/* Section 8 — VAT line */}
          <VatLine />

          {/* Country availability — surfaced BEFORE checkout so nobody runs the whole funnel only to be
              declined at the till (ADR-062: a Stripe Radar rule blocks a few countries pre-charge). */}
          <p className="mt-4 text-center text-sm text-[var(--fg-muted)]">
            Payment isn&apos;t available in every country yet.{" "}
            <a href="#faq" className="text-[var(--accent)] hover:underline">See who can buy</a>.
          </p>

          {/* Section 9 — FAQ */}
          <div id="faq" className="mt-16 max-w-3xl mx-auto border-t border-[var(--border)] pt-12">
            <h2 className="text-2xl font-bold text-[var(--fg)] mb-6">Frequently asked questions</h2>
            <FAQAccordion items={faqItems} />
          </div>

        </div>
      </div>

    </>
  )
}
