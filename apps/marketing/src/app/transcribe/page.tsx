import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { IndexSection, INK, WRAP, MONO, H2 } from "@/components/marketing/IndexSection"
import Link from "next/link"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { ClosingCTASection } from "@/components/marketing/ClosingCTASection"
import { transcriptionRouterPhrase } from "@indxr/shared/lib/models"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"
import { CREDIT_COSTS, FREE_TIER, PACKAGES, PER_FILE_EUR_PER_MIN, PER_FILE_MIN_EUR, formatEurExact, pricePerMinute } from "@indxr/shared/lib/pricing"

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
    answer: `TXT is free and needs no account. Markdown, CSV, SRT, VTT and JSON are free with a free account. RAG-optimized JSON costs ${CREDIT_COSTS.RAG_JSON_PER_10MIN} credit per 10 minutes of video.`,
  },
]

const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))

const STEPS = [
  { n: "01", t: "Drop in a file or a link", b: "Audio or video from your computer, or a YouTube URL." },
  { n: "02", t: "See the price and a preview", b: "Captions are free and instant. For a file you get the price plus a free preview of the first part, up to 3 minutes." },
  { n: "03", t: "Pay for that file, or use credits", b: "No account needed for one file. With an account, credits cover everything and never expire." },
]

export default function FreeToolPage() {
  return (
    <>
      {/* Hero: what it does + the three steps left, the live tool right. growth-plan.md §6.3 H7:
          only YouTube captions are free — named explicitly, never implied for file uploads. */}
      <section className="w-full bg-[var(--bg)] pt-[96px] lg:pt-[112px]">
        <div className={`${WRAP} grid items-start gap-x-12 gap-y-10 pb-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:pb-24`}>
          {/* Grid order: heading → tool → steps on mobile (the tool is the action); on desktop the tool
              spans both rows on the right. */}
          <div>
            <p className={`${MONO} mb-6 text-[var(--fg)]`}>Transcribe</p>
            <h1 className="text-[2.5rem] font-bold leading-[0.96] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-6xl">
              Audio, video and YouTube. As text, in minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--fg)]">
              YouTube videos with captions are free. Files are paid per minute, and you see the price first.
              Export as {exportFormatsProse("or")}.
            </p>
          </div>
          <div id="tool" className="scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <FreeToolEmbed />
          </div>
          <div>
            <ol className={`border-t-2 ${INK}`}>
              {STEPS.map((st) => (
                <li key={st.n} className={`grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b-2 ${INK} py-4`}>
                  <span className="font-mono text-sm font-bold text-[var(--fg-strong)]">{st.n}</span>
                  <div>
                    <p className="font-bold text-[var(--fg-strong)]">{st.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--fg-subtle)]">{st.b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <IndexSection n="01" label="What it costs">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className={H2}>Free when the captions exist.</h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--fg-subtle)]">
              When there are no captions, or you want punctuation and speakers, AI transcription takes over. You
              always see the cost before anything runs.
            </p>
          </div>
          <dl className={`border-2 ${INK} font-mono text-sm`}>
            {[
              ["YouTube with captions", "free"],
              ["One file, no account", `${formatEurExact(PER_FILE_EUR_PER_MIN)}/min · min ${formatEurExact(PER_FILE_MIN_EUR)}`],
              ["With credits", `from ${formatEurExact(cheapestPerMin)}/min`],
              ["Free account", `${FREE_TIER.WELCOME_CREDITS} credits`],
            ].map(([k, v], i) => (
              <div key={k} className={`flex items-baseline gap-2 px-5 py-4 ${i > 0 ? `border-t-2 ${INK}` : ""}`}>
                <dt className="text-[var(--fg)]">{k}</dt>
                <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-[var(--fg-muted)]" />
                <dd className="whitespace-nowrap font-bold text-[var(--fg-strong)]">{v}</dd>
              </div>
            ))}
            <div className={`border-t-2 ${INK} px-5 py-3`}>
              <Link href="/pricing" className="font-bold text-[var(--fg-strong)] underline-offset-4 hover:underline">
                All prices →
              </Link>
            </div>
          </dl>
        </div>
      </IndexSection>

      <IndexSection n="02" label="Questions">
        <h2 className={`${H2} mb-10`}>Good to know.</h2>
        <FAQAccordion items={faqItems} />
        <p className="mt-8 text-sm text-[var(--fg-muted)]">
          <a href="/docs" className="text-[var(--link)] underline-offset-4 hover:underline">How transcription works</a>
          {" · "}Read more:{" "}
          <a href="/articles/transcribe-interviews-journalism" className="underline hover:text-[var(--fg)]">transcribing interviews</a>,{" "}
          <a href="/articles/audio-to-text" className="underline hover:text-[var(--fg)]">audio to text</a>,{" "}
          <a href="/articles/srt-generator" className="underline hover:text-[var(--fg)]">generating SRT subtitles</a>.
        </p>
      </IndexSection>

      <ClosingCTASection
        headline="More than single videos?"
        oneLiner={`A free account comes with ${FREE_TIER.WELCOME_CREDITS} credits, no card needed: playlists, AI transcription and your own library.`}
        primaryCtaLabel="Create a free account"
        primaryCtaHref="/signup"
        secondaryLabel="Or keep using the tool"
        secondaryHref="#tool"
      />
    </>
  )
}
