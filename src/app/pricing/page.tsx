import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { JsonLd } from "@/components/seo/JsonLd"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { PricingHero } from "@/components/pricing/PricingHero"
import { AlwaysFreeBlock } from "@/components/pricing/AlwaysFreeBlock"
import { PricingTierGrid } from "@/components/pricing/PricingTierGrid"
import { SecondaryTierStrip } from "@/components/pricing/SecondaryTierStrip"
import { CreditCostTable } from "@/components/pricing/CreditCostTable"
import { TrustRowCards } from "@/components/pricing/TrustRowCards"
import { VatLine } from "@/components/pricing/VatLine"
import { PACKAGES } from "@/lib/pricing"

export const metadata: Metadata = {
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
    answer: "No. Extracting a single video with auto-captions is free without an account. A free account gives you 25 welcome credits and unlocks all export formats.",
  },
  {
    question: "What happens when I run out of credits?",
    answer: "You can purchase a new package. Your library and all previously extracted transcripts remain available — nothing is deleted when your credit balance reaches zero.",
  },
  {
    question: "What if I need fewer credits than Basic?",
    answer: "The Try package (€2.49 / 150 credits) is available for a single project or a quick test.",
  },
  {
    question: "Does INDXR.AI work for audio files, not just YouTube?",
    answer: "Yes. Audio Upload accepts MP3, MP4, WAV, M4A, OGG, FLAC, and WEBM files up to 500MB. Same AI transcription pipeline, same credit cost (1 credit per minute), same export options.",
  },
  {
    question: "Is RAG JSON export included in the standard price?",
    answer: "RAG JSON export costs 1 credit per 15 minutes of video (minimum 1 credit) on top of extraction costs. The first 3 RAG exports are free.",
  },
  {
    question: "Can I get a refund?",
    answer: "We offer refunds within 7 days if you haven't used more than 5 credits.",
  },
  {
    question: "How is VAT handled?",
    answer: "[placeholder — Khidr writes: alle prijzen zijn inclusief BTW. Stripe past het correcte BTW-tarief toe op basis van je land bij afrekenening.]",
  },
  {
    question: "Can I get an invoice for business use?",
    answer: "[placeholder — Khidr writes: ja, Stripe genereert automatisch een factuur op elke aankoop. Je ontvangt deze via e-mail na betaling.]",
  },
  {
    question: "What payment methods are supported?",
    answer: "[placeholder — Khidr writes: credit/debit cards, iDEAL, Bancontact, en andere betaalmethoden die Stripe ondersteunt in de EU.]",
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

      <div className="min-h-screen bg-[var(--bg)]">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto pb-24">

          {/* Section 2 — Hero */}
          <PricingHero />

          {/* Section 3 — Always-free disclosure */}
          <AlwaysFreeBlock />

          {/* Section 4 — 3 prominent tier cards */}
          <PricingTierGrid />

          {/* Section 5 — Secondary tiers (Try + Power) */}
          <SecondaryTierStrip />

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

      {/* Section 10 — Footer */}
      <Footer />
    </>
  )
}
