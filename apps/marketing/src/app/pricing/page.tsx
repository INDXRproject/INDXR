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
import { PACKAGES, CREDIT_COSTS, tierPriceCredits } from "@indxr/shared/lib/pricing"
import { LIBRARY_STORAGE_BASE_MB } from "@indxr/shared/lib/storage"
import { MonthPlanner } from "@/components/pricing/MonthPlanner"
import { IndexSection, INK, WRAP, MONO, H2 } from "@/components/marketing/IndexSection"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — INDXR.AI",
  description: `AI transcription credits from €${PACKAGES[0].priceEur.toFixed(2)}. YouTube captions and the Claude/ChatGPT connection are free. No subscription, credits never expire.`,
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
  description: "Pay-per-use AI transcription credits. YouTube captions and the Claude/ChatGPT connection are free. No subscription, credits never expire.",
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

// What never costs a credit — the hero's "free column". Each line derives from a constant.
const ALWAYS_FREE: Array<[string, string]> = [
  ["YouTube with captions", "every video"],
  ["Playlists with captions", `first ${FREE_TIER.PLAYLIST_FREE_VIDEOS} videos`],
  ["Every export except RAG JSON", "always"],
  ["Claude & ChatGPT connection", "always"],
  ["Library storage", `${LIBRARY_STORAGE_BASE_MB} MB`],
  ["New account", `${FREE_TIER.WELCOME_CREDITS} credits`],
]

export default function PricingPage() {
  return (
    <>
      <JsonLd schemas={[aggregateOfferSchema, faqSchema]} />

      {/* Hero: the promise left, everything that is free right — before any price. */}
      <section className="w-full bg-[var(--bg)] pt-[96px] lg:pt-[112px]">
        <div className={`${WRAP} grid items-end gap-12 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-20`}>
          <div>
            <p className={`${MONO} mb-6 text-[var(--fg)]`}>Pricing</p>
            <h1 className="text-[2.75rem] font-bold leading-[0.94] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl lg:text-[5.25rem]">
              Pay for minutes. Not months.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--fg)] sm:text-xl">
              Buy credits once, spend them when you need them. {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit is 1 minute of AI
              transcription, and credits never expire.
            </p>
          </div>
          <div className={`border-2 ${INK} bg-[var(--bg)]`}>
            <p className={`${MONO} border-b-2 ${INK} bg-[var(--accent)] px-5 py-3 font-bold text-[var(--fg-on-accent)]`}>
              Free, without credits
            </p>
            <dl className="px-5 py-3 font-mono text-sm">
              {ALWAYS_FREE.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 py-1.5">
                  <dt className="text-[var(--fg)]">{k}</dt>
                  <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-[var(--fg-muted)]" />
                  <dd className="whitespace-nowrap font-bold text-[var(--fg-strong)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <IndexSection n="01" label="Credit packs" id="packs">
        <h2 className={`${H2} mb-10`}>Pick a pack. Keep it forever.</h2>
        {/* Tier grid (shared with app billing). CTA = auth-aware marketing BuyButton. */}
        <PricingTiers
          renderCta={(pkg, opts) => <BuyButton pkg={pkg} featured={pkg.mostPopular} compact={opts?.compact} />}
        />
        <p className="mt-6 text-sm text-[var(--fg-muted)]">
          All prices include VAT. Every purchase comes with a VAT invoice you can download from your account.
          Payment isn&apos;t available in every country yet:{" "}
          <a href="#faq" className="text-[var(--link)] underline-offset-4 hover:underline">see who can buy</a>.
        </p>
      </IndexSection>

      <IndexSection n="02" label="Your month" tone="subtle">
        <h2 className={`${H2} mb-4`}>How far does a pack go?</h2>
        <p className="mb-10 max-w-2xl text-lg text-[var(--fg-subtle)]">
          Slide to the hours you expect to transcribe with AI each month. Compared with an unlimited
          subscription at about ${SUBSCRIPTION_EUR} a month (billed yearly), credits are cheaper up to roughly{" "}
          {breakEvenHours} hours a month at {formatEurExact(cheapestPerMin)} a minute.
        </p>
        <MonthPlanner subscriptionPerMonth={SUBSCRIPTION_EUR} />
      </IndexSection>

      <IndexSection n="03" label="Per task">
        <h2 className={`${H2} mb-8`}>What one job costs.</h2>
        <CreditCostTable />
      </IndexSection>

      <IndexSection n="04" label="No account">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 className={H2}>Just one file? {formatEurExact(PER_FILE_EUR_PER_MIN)} a minute.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--fg-subtle)]">
              Upload a single recording, see the price and a free preview of the first minutes, then pay for
              that file only (minimum {formatEurExact(PER_FILE_MIN_EUR)}). No account, no credits.
            </p>
          </div>
          <a
            href={marketingHref("/transcribe")}
            className={`inline-flex h-14 items-center justify-center border-2 ${INK} bg-[var(--accent)] px-6 font-bold text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)]`}
          >
            Transcribe one file →
          </a>
        </div>
      </IndexSection>

      <IndexSection n="05" label="Questions" id="faq">
        <h2 className={`${H2} mb-10`}>Before you buy.</h2>
        <TrustRowCards />
        <FAQAccordion items={faqItems} className="mt-12" />
        <p className="mt-8 text-sm text-[var(--fg-muted)]">
          Coming from another tool?{" "}
          <Link href="/alternatives/otter-ai" className="text-[var(--link)] underline-offset-4 hover:underline">
            INDXR vs Otter.ai
          </Link>
          .
        </p>
      </IndexSection>
    </>
  )
}
