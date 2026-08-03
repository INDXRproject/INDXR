import type { Metadata } from "next"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { uploadFormatsProse, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { JsonLd } from "@/components/seo/JsonLd"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { PricingHero } from "@/components/pricing/PricingHero"
import { AlwaysFreeBlock } from "@/components/pricing/AlwaysFreeBlock"
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
    answer: `Yes. Audio Upload accepts ${uploadFormatsProse("and")} files up to ${UPLOAD_MAX_FILE_MB}MB. Same AI transcription pipeline, same credit cost (1 credit per minute), same export options.`,
  },
  {
    question: "Is RAG JSON export included in the standard price?",
    answer: "RAG JSON export costs 1 credit per 10 minutes of video (minimum 1 credit) on top of extraction costs. Re-downloading a transcript you've already exported to RAG JSON is free.",
  },
  {
    question: "Can I get a refund?",
    answer: "We offer refunds within 7 days if you haven't used more than 5 credits.",
  },
  {
    question: "How is VAT handled?",
    answer: "All prices include VAT. Stripe applies the correct VAT rate for your country at checkout.",
  },
  {
    question: "Can I get an invoice for business use?",
    answer: "Yes — Stripe automatically generates an invoice for every purchase, emailed to you after payment. Your purchase history is also on your account page.",
  },
  {
    question: "What payment methods are supported?",
    answer: "Credit and debit cards, iDEAL, Bancontact, and the other payment methods Stripe supports in the EU.",
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

          {/* Section 3 — Always-free disclosure */}
          <AlwaysFreeBlock />

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

          {/* Section 9 — FAQ */}
          <div className="mt-16 max-w-3xl mx-auto border-t border-[var(--border)] pt-12">
            <h2 className="text-2xl font-bold text-[var(--fg)] mb-6">Frequently asked questions</h2>
            <FAQAccordion items={faqItems} />
          </div>

        </div>
      </div>

    </>
  )
}
