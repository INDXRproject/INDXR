import type { Metadata } from "next"
import Link from "next/link"
import { uploadFormatsProse, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { FREE_TIER, PER_FILE_EUR_PER_MIN, PER_FILE_MIN_EUR, formatEurExact, pricePerMinute } from "@indxr/shared/lib/pricing"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { JsonLd } from "@/components/seo/JsonLd"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { PricingTiers } from "@indxr/shared/components/pricing/PricingTiers"
import { BuyButton } from "@/components/pricing/BuyButton"
import { CreditCostTable } from "@/components/pricing/CreditCostTable"
import { TrustRowCards } from "@/components/pricing/TrustRowCards"
import { VatLine } from "@/components/pricing/VatLine"
import { PACKAGES, tierPriceCredits } from "@indxr/shared/lib/pricing"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — INDXR.AI",
  description: `YouTube transcript extraction and AI transcription credits. Starting at €${PACKAGES[0].priceEur.toFixed(2)} — pay-per-use, no subscription, VAT included. Credits never expire.`,
  ...pageOg("/pricing"),
}

const faqItems: FAQItem[] = [
  {
    question: "Do credits expire?",
    answer: "Never. Buy when you want, use when you're ready. There's no time limit.",
  },
  {
    question: "Do I need an account to get started?",
    answer: `No. Extracting a single video with YouTube captions is free without an account. A free account gives you ${FREE_TIER.WELCOME_CREDITS} welcome credits and unlocks all export formats.`,
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

// Break-even against a subscription (growth-live-status §0, positionering 4-11): a typical unlimited
// transcription subscription costs $10/month billed yearly ($20 month-to-month, TurboScribe, checked
// 2026-11-06). At our lowest per-minute rate, that monthly amount buys this many hours — below it,
// credits are cheaper, and unused credits roll over forever. Derived, never typed.
const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))
const SUBSCRIPTION_EUR = 10
const breakEvenHours = Math.round(SUBSCRIPTION_EUR / cheapestPerMin / 60)

const INK = "border-[var(--fg-strong)]"
const MONO_LABEL = "font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]"

export default function PricingPage() {
  return (
    <>
      <JsonLd schemas={[aggregateOfferSchema, faqSchema]} />

      <div className="min-h-screen bg-[var(--bg)]">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto pb-24">

          {/* Hero — stijl B: mono label + big type, left-aligned on the same max-w-5xl as the grid. */}
          <div className="max-w-5xl mx-auto pt-[104px] lg:pt-[120px] pb-12">
            <p className={`${MONO_LABEL} mb-5`}>Pricing</p>
            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl lg:text-[5.5rem]">
              Pay for minutes. Not months.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--fg-subtle)]">
              YouTube caption extraction is always free. Credits apply only when you use AI transcription,
              playlist caption processing beyond the first three videos, AI summaries, or RAG JSON export.
              1 credit is 1 minute, and credits never expire.
            </p>
          </div>

          {/* Tier grid (shared with app billing). CTA = auth-aware marketing BuyButton. */}
          <PricingTiers
            renderCta={(pkg, opts) => (
              <BuyButton pkg={pkg} featured={pkg.mostPopular} compact={opts?.compact} />
            )}
          />

          {/* Credits vs a subscription + the single-file side door */}
          <div className={`max-w-5xl mx-auto mt-16 grid md:grid-cols-2 border-2 ${INK}`}>
            <div className={`p-6 sm:p-8 border-b-2 md:border-b-0 md:border-r-2 ${INK}`}>
              <p className={`${MONO_LABEL} mb-3`}>Credits or a subscription?</p>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-[var(--fg-strong)] sm:text-3xl">
                Cheaper unless you transcribe more than about {breakEvenHours} hours a month.
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--fg-subtle)]">
                Unlimited transcription subscriptions typically cost around ${SUBSCRIPTION_EUR} a month when
                billed yearly. At {formatEurExact(cheapestPerMin)} a minute, the same amount buys about{" "}
                {breakEvenHours} hours of AI transcription here, and whatever you don&apos;t use this month is
                still yours next year.
              </p>
            </div>
            <div className="p-6 sm:p-8 bg-[var(--bg-subtle)]">
              <p className={`${MONO_LABEL} mb-3`}>Just one file?</p>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-[var(--fg-strong)] sm:text-3xl">
                {formatEurExact(PER_FILE_EUR_PER_MIN)} a minute, no account.
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--fg-subtle)]">
                Upload a single recording, see the price and a free preview of the first minutes, then pay for
                that file only (minimum {formatEurExact(PER_FILE_MIN_EUR)} per file). No account, no credits.
              </p>
              <a
                href={marketingHref("/transcribe")}
                className={`mt-6 inline-flex items-center border-2 ${INK} bg-[var(--bg)] px-5 py-3 text-sm font-bold text-[var(--fg-strong)] hover:bg-[var(--bg-subtle)]`}
              >
                Transcribe one file →
              </a>
            </div>
          </div>

          {/* Credit-cost table with tier toggle */}
          <CreditCostTable />

          {/* Trust row */}
          <TrustRowCards />

          {/* VAT line */}
          <VatLine />

          {/* Country availability — surfaced BEFORE checkout so nobody runs the whole funnel only to be
              declined at the till (ADR-062: a Stripe Radar rule blocks a few countries pre-charge). */}
          <p className="mt-4 max-w-5xl mx-auto text-sm text-[var(--fg-muted)]">
            Payment isn&apos;t available in every country yet.{" "}
            <a href="#faq" className="text-[var(--link)] hover:underline">See who can buy</a>.
          </p>

          {/* Comparison landing page — surfaced for people weighing INDXR against another tool (ADR-105). */}
          <p className="mt-2 max-w-5xl mx-auto text-sm text-[var(--fg-muted)]">
            Coming from another tool?{" "}
            <Link href="/alternatives/otter-ai" className="text-[var(--link)] hover:underline">
              INDXR vs Otter.ai
            </Link>
            .
          </p>

          {/* FAQ */}
          <div id="faq" className={`mt-20 max-w-5xl mx-auto border-t-2 ${INK} pt-12`}>
            <h2 className="text-3xl font-bold tracking-[-0.035em] text-[var(--fg-strong)] mb-6 sm:text-4xl">Frequently asked questions</h2>
            <FAQAccordion items={faqItems} />
          </div>

        </div>
      </div>
    </>
  )
}
