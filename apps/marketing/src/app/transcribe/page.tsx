import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { PricingTeaserBlock } from "@/components/marketing/PricingTeaserBlock"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { ClosingCTASection } from "@/components/marketing/ClosingCTASection"
import { transcriptionRouterPhrase } from "@indxr/shared/lib/models"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"
import { FREE_TIER } from "@indxr/shared/lib/pricing"

const faqItems: FAQItem[] = [
  {
    question: "What's the difference between YouTube captions and AI transcription?",
    answer: "YouTube captions come straight from the video's own subtitle track — free and instant. AI transcription uses AssemblyAI to generate a transcript from the audio when no captions exist, at 1 credit per minute.",
  },
  {
    question: "Why would I sign up if the tool is free?",
    answer: `The free tier covers single videos with YouTube captions. Signing up (free, no card) adds ${FREE_TIER.WELCOME_CREDITS} credits, playlists, AI transcription, every export format beyond TXT, and your personal library.`,
  },
  {
    question: "What if my video doesn't have captions?",
    answer: "INDXR detects this up front and offers AI transcription instead. You see the exact credit cost before confirming — no surprise charges.",
  },
  {
    question: "Can I extract a full playlist without an account?",
    answer: `Playlist extraction needs a free account. Signing up is free, includes ${FREE_TIER.WELCOME_CREDITS} credits, and needs no credit card.`,
  },
  {
    question: "What languages are supported?",
    answer: `YouTube caption extraction works for any language YouTube provides captions for. For AI transcription, ${transcriptionRouterPhrase()}.`,
  },
  {
    question: "What export formats can I get?",
    answer: "TXT is free and needs no account. Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON are all available with a free account.",
  },
]

export default function FreeToolPage() {
  return (
    <>
      {/* Hero + tool */}
      <div className="container max-w-4xl py-24 px-4 mx-auto text-center">
        <h1 className="text-4xl font-bold text-[var(--fg)] mb-6">
          Free YouTube transcript generator
        </h1>
        <p className="text-[var(--fg-muted)] mb-10 text-lg max-w-2xl mx-auto">
          Extract YouTube transcripts instantly. Free for videos with captions. AI transcription for videos without. Export as {exportFormatsProse("or")}. No extension needed.
        </p>

        <FreeToolEmbed />

        {/* Quiet docs link under the card */}
        <p className="mt-6 text-sm text-[var(--fg-muted)]">
          <a href="/docs" className="hover:text-[var(--fg)] transition-colors">Learn how transcription works →</a>
        </p>
      </div>

      {/* Below-fold sections */}
      <PricingTeaserBlock />

      <div className="container max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-[var(--fg)] mb-6">Frequently asked questions</h2>
        <FAQAccordion items={faqItems} />
      </div>

      <ClosingCTASection
        headline="Ready for more than single videos?"
        oneLiner={`Sign up free — ${FREE_TIER.WELCOME_CREDITS} credits included, no credit card needed. Unlock playlists, AI transcription, and your library.`}
        primaryCtaLabel="Sign up free"
        primaryCtaHref="/signup"
        secondaryLabel="Or keep using the free tool above"
        secondaryHref="/transcribe"
      />
    </>
  )
}
