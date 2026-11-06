import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { HomeClipVideo } from "@/components/marketing/HomeClipVideo"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { JsonLd } from "@/components/seo/JsonLd"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { CREDIT_COSTS, FREE_TIER, PACKAGES, pricePerMinute } from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { EXPORT_FORMAT_COUNT, EXPORT_DOWNLOAD_COUNT } from "@indxr/shared/lib/exportFormats"

export const metadata: Metadata = {
  title: "INDXR.AI — Accurate transcripts from audio, video and YouTube",
  description:
    "Upload a recording or paste a link. Get an accurate, speaker-labelled transcript you can edit, search and export. Credits, no subscription — they never expire.",
  alternates: { canonical: "/" },
}

// Homepage structured data. Two distinct @types (Organization + WebSite), never two of
// the same type on this page. WebSite replaced SoftwareApplication on 2026-11-03: Google's Software App
// rich result requires aggregateRating/review, which INDXR does not have on-site (Ahrefs: validation
// error). WebSite carries the same name + description, so the ADR-102 brand disambiguation holds. Both carry name "INDXR.AI" and a transcription-first description so
// Google's AI Overview stops conflating the brand with the unrelated open-source project
// github.com/bahdotsh/indxr. See ADR-102.
const homeSchemas: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    logo: "https://indxr.ai/apple-touch-icon.png",
    description:
      "INDXR.AI turns audio, video and YouTube links into accurate, speaker-labelled transcripts you can edit, search and export.",
    email: "support@indxr.ai",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "support@indxr.ai" },
    sameAs: ["https://alternativeto.net/software/indxr-ai/about/"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    description:
      "Upload a recording or paste a link and get an accurate, speaker-labelled transcript you can edit, search and export. Credits, no subscription — they never expire.",
    publisher: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai" },
  },
]

// Every number on this page renders from a constant:
const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const maxHours = MAX_TRANSCRIPTION_HOURS
const aiPerMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const summaryPer10 = CREDIT_COSTS.AI_SUMMARY_PER_10MIN
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN
const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))
const cheapestPack = Math.min(...PACKAGES.map((p) => p.priceEur))
const eur = (n: number) => `€${n.toFixed(n < 1 ? 2 : 0)}`

// Stijl B (besluit Khidr 2026-11-05, mockup "Drie stijlen" B): white paper, ink, amber blocks,
// hard 2px rules, no photo. Every section shares one container and one rule weight.
const RULE = "border-[var(--fg-strong)]"
const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6"
const MONO_LABEL = "font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]"
const H2 = "text-3xl font-bold leading-[1.02] tracking-[-0.035em] text-[var(--fg-strong)] sm:text-5xl"
const BTN_PRIMARY =
  "inline-flex h-14 w-full cursor-pointer items-center justify-center border-2 border-[var(--fg-strong)] bg-[var(--accent)] px-6 text-base font-bold text-[var(--fg-on-accent)] transition-colors duration-150 hover:bg-[var(--accent-hover)] sm:w-auto"
const BTN_SECONDARY =
  "inline-flex h-14 w-full cursor-pointer items-center justify-center border-2 border-[var(--fg-strong)] bg-[var(--bg)] px-6 text-base font-bold text-[var(--fg-strong)] transition-colors duration-150 hover:bg-[var(--bg-subtle)] sm:w-auto"

const QUOTE =
  "We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard."

const pillars = [
  {
    n: "01",
    heading: "YouTube",
    body: "One video or a whole playlist. Captions are free; videos without them are transcribed with AI.",
  },
  {
    n: "02",
    heading: "Your recordings",
    body: `Lectures, interviews, podcasts, meetings. Files up to ${maxHours} hours, processed in the EU.`,
  },
  {
    n: "03",
    heading: "One library",
    body: "Search the text of every transcript, group them in collections, export to whatever you use next.",
  },
]

const uses = [
  {
    t: "A course you want to read.",
    b: "Drop in a playlist and get every lecture as text, each with a chapter summary you can skim before deciding what to reread. Export the lot as Markdown and your notes app has the whole course in it.",
  },
  {
    t: "Research interviews and source material.",
    b: "Speakers are separated automatically and you rename them to who they actually are. Timestamps link back to the second something was said, so every quote is one click from its source.",
  },
  {
    t: "A video that needs subtitles.",
    b: "SRT and VTT built to the broadcast standard rather than chopped on character count, ready to drop into any editor.",
  },
  {
    t: "Text you want to build on.",
    b: "Chunked JSON with timestamps and deep links, made for feeding a vector database instead of reformatting by hand.",
  },
]

const gets = [
  { t: "Read it properly.", b: "Real paragraphs instead of two-second fragments, with timestamps on or off." },
  { t: "Know who said what.", b: "Automatic speaker separation, with names you set yourself." },
  { t: "Get the shape of it.", b: "A summary broken into chapters, each with its own timestamp and worked-out notes." },
  { t: "Edit either of them.", b: "Your edited version is kept alongside the original rather than replacing it." },
  {
    t: "Take it anywhere.",
    b: `${EXPORT_FORMAT_COUNT} formats, ${EXPORT_DOWNLOAD_COUNT} downloads: plain text, Markdown with front matter, CSV, JSON, SRT, VTT. All included.`,
  },
]

export default async function LandingPage() {
  // Auth-aware copy: a logged-in visitor already has an account, so the welcome-credit promise
  // would be wrong for them; only that sentence differs.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loggedIn = !!user

  return (
    <>
      <JsonLd schemas={homeSchemas} />

      {/* Hero — big type, no photo. pt clears the fixed header. */}
      <section className="w-full bg-[var(--bg)] pt-[104px] lg:pt-[120px]">
        <div className={`${WRAP} pb-12 lg:pb-16`}>
          <p className={`${MONO_LABEL} mb-6`}>Transcripts, done properly.</p>
          <h1 className="max-w-5xl text-[2.75rem] font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl lg:text-[6.25rem]">
            Every lecture, interview and video you learn from. As text.
          </h1>
          <div className="mt-10 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <p className="max-w-xl text-lg leading-relaxed text-[var(--fg)] sm:text-xl">
              YouTube videos and playlists, and your own recordings. Speakers, punctuation and timestamps,
              in one library you can search and export.
            </p>
            <div className="flex flex-col sm:flex-row">
              <Link href="#try" className={BTN_PRIMARY}>
                Try it now, no account <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className={`${BTN_SECONDARY} -mt-[2px] sm:mt-0 sm:-ml-[2px]`}>
                See pricing
              </Link>
            </div>
          </div>
          <p className="mt-6 font-mono text-sm text-[var(--fg-subtle)]">
            Captions free · AI from {eur(cheapestPerMin)}/min · no subscription, credits never expire
          </p>
        </div>
      </section>

      {/* Before / after — the proof, in the product's own words */}
      <section className={`w-full border-y-2 ${RULE} bg-[var(--bg)]`}>
        <div className="mx-auto grid w-full max-w-6xl md:grid-cols-2">
          <div className={`border-b-2 ${RULE} bg-[var(--bg-subtle)] px-4 py-10 sm:px-6 md:border-b-0 md:border-r-2`}>
            <p className={`${MONO_LABEL} mb-4`}>Before — YouTube captions</p>
            <p className="font-mono text-base leading-[1.9] text-[var(--fg-muted)] sm:text-lg">
              we choose to go to the
              <br />
              moon in this decade and do
              <br />
              the other things not because
              <br />
              they are easy but because
              <br />
              they are hard
            </p>
          </div>
          <div className="px-4 py-10 sm:px-6">
            <p className={`${MONO_LABEL} mb-4`}>After — INDXR</p>
            <p className="mb-3 font-mono text-sm text-[var(--fg)]">
              <span className={`mr-2 border-2 ${RULE} bg-[var(--accent)] px-1.5 py-0.5 text-[var(--fg-on-accent)]`}>Speaker</span>
              John F. Kennedy
            </p>
            <p className="text-2xl font-medium leading-snug tracking-[-0.01em] text-[var(--fg-strong)] sm:text-3xl">
              {QUOTE}
            </p>
            <p className="mt-4 text-sm text-[var(--fg-muted)]">Address at Rice University, 1962 · public domain</p>
          </div>
        </div>
      </section>

      {/* Try it — the live tool */}
      <section id="try" className="w-full scroll-mt-24 bg-[var(--bg)]">
        <div className={`${WRAP} py-16 lg:py-20`}>
          <p className={`${MONO_LABEL} mb-3`}>Try it</p>
          <h2 className={`${H2} mb-4`}>Your own file or link.</h2>
          <p className="mb-10 max-w-2xl text-lg text-[var(--fg-subtle)]">
            {loggedIn ? (
              <>Upload an audio or video file, or paste a link, and see the transcript for yourself. Playlists and file uploads open in the app.</>
            ) : (
              <>
                No account, no card. Upload an audio or video file, or paste a link, and see the transcript for
                yourself. A free account comes with {welcomeCredits} credits, enough for {welcomeMinutes} minutes
                of AI transcription.
              </>
            )}
          </p>
          <FreeToolEmbed />
        </div>
      </section>

      {/* Three pillars — 01 / 02 / 03 */}
      <section className={`w-full border-y-2 ${RULE} bg-[var(--bg)]`}>
        <div className="mx-auto grid w-full max-w-6xl md:grid-cols-3">
          {pillars.map((p, i) => (
            <div
              key={p.n}
              className={`px-4 py-10 sm:px-6 ${i < pillars.length - 1 ? `border-b-2 md:border-b-0 md:border-r-2 ${RULE}` : ""} ${i === 2 ? "bg-[var(--accent)] text-[var(--fg-on-accent)]" : ""}`}
            >
              <p className={`text-5xl font-bold tracking-[-0.04em] ${i === 2 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-strong)]"}`}>{p.n}</p>
              <h3 className={`mt-3 mb-2 text-2xl font-bold ${i === 2 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-strong)]"}`}>{p.heading}</h3>
              <p className={`leading-relaxed ${i === 2 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-subtle)]"}`}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* See it in action */}
      <section className="w-full bg-[var(--bg)]">
        <div className={`${WRAP} py-16 lg:py-20`}>
          <p className={`${MONO_LABEL} mb-3`}>See it in action</p>
          <h2 className={`${H2} mb-8`}>One minute, link to export.</h2>
          <div className={`border-2 ${RULE}`}>
            <HomeClipVideo />
          </div>
        </div>
      </section>

      {/* What people bring to it */}
      <section className={`w-full border-t-2 ${RULE} bg-[var(--bg)]`}>
        <div className={`${WRAP} grid items-start gap-12 py-16 lg:grid-cols-2 lg:py-20`}>
          <div>
            <p className={`${MONO_LABEL} mb-3`}>Who it is for</p>
            <h2 className={`${H2} mb-8`}>What people bring to it.</h2>
            <div className={`border-t-2 ${RULE}`}>
              {uses.map((u) => (
                <div key={u.t} className={`border-b-2 ${RULE} py-5`}>
                  <h3 className="mb-1.5 text-lg font-bold text-[var(--fg-strong)]">{u.t}</h3>
                  <p className="leading-relaxed text-[var(--fg-subtle)]">{u.b}</p>
                </div>
              ))}
            </div>
          </div>
          <DocsFigure
            src="/docs/screenshots/justice-summary.png"
            alt="A lecture open on its Summary tab: an AI summary of the Harvard 'Justice' lecture, with an overview paragraph beneath the heading, inside the app with its sidebar."
            caption="A playlist becomes lectures you can skim: each one gets a chapter summary."
          />
        </div>
      </section>

      {/* What you get from a single transcript */}
      <section className={`w-full border-t-2 ${RULE} bg-[var(--bg)]`}>
        <div className={`${WRAP} grid items-start gap-12 py-16 lg:grid-cols-2 lg:py-20`}>
          <div>
            <p className={`${MONO_LABEL} mb-3`}>One transcript</p>
            <h2 className={`${H2} mb-8`}>More than the words.</h2>
            <div className={`border-t-2 ${RULE}`}>
              {gets.map((g) => (
                <div key={g.t} className={`border-b-2 ${RULE} py-5`}>
                  <h3 className="mb-1.5 text-lg font-bold text-[var(--fg-strong)]">{g.t}</h3>
                  <p className="leading-relaxed text-[var(--fg-subtle)]">{g.b}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <DocsFigure
              src="/docs/screenshots/justice-viewer.png"
              alt="An open transcript in reading view: the Harvard 'Justice' lecture in clean paragraphs, each labelled with its speaker, inside the app with its sidebar and toolbar."
              caption="A transcript opens in a clean reading view, in real paragraphs with speaker labels."
            />
            <DocsFigure
              src="/docs/screenshots/justice-export.png"
              alt="The export menu open on a transcript: the full list of formats — plain text, Markdown, JSON, CSV, SRT, VTT — with and without timestamps."
              caption="Take it anywhere: the export menu, every format included, one click away."
            />
          </div>
        </div>
      </section>

      {/* Your library */}
      <section className={`w-full border-t-2 ${RULE} bg-[var(--bg)]`}>
        <div className={`${WRAP} grid items-start gap-12 py-16 lg:grid-cols-2 lg:py-20`}>
          <div>
            <p className={`${MONO_LABEL} mb-3`}>Your library</p>
            <h2 className={`${H2} mb-6`}>Search every word you have collected.</h2>
            <p className="mb-4 text-lg leading-relaxed text-[var(--fg-subtle)]">
              Everything you transcribe stays. Search the text of all of it, filter and sort it, and group it
              into collections per project or course. Export a whole collection at once as a zip.
            </p>
            <p className="text-lg leading-relaxed text-[var(--fg-subtle)]">
              The transcript you made in March is still there in September, in the same format as the one you
              made today.
            </p>
          </div>
          <DocsFigure
            src="/docs/screenshots/justice-library.png"
            alt="The library: a search box and filter controls above rows of saved transcripts, the Harvard 'Justice' lecture at the top, with named collections in the sidebar."
            caption="Search, filter, and collections turn a list into an organised library."
          />
        </div>
      </section>

      {/* What it costs */}
      <section className={`w-full border-t-2 ${RULE} bg-[var(--bg)]`}>
        <div className={`${WRAP} grid items-start gap-12 py-16 lg:grid-cols-2 lg:py-24`}>
          <div>
            <p className={`${MONO_LABEL} mb-3`}>Pricing</p>
            <h2 className="text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl">
              Pay for minutes. Not months.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--fg-subtle)]">
              You buy credits, you spend them when you need them, and they never expire. Come back after six
              months and they are still there.
            </p>
            <p className="mt-4 text-[var(--fg-subtle)]">
              {loggedIn ? (
                <>Extracting captions from a YouTube video that already has them is free, however many you do.</>
              ) : (
                <>
                  A free account starts with {welcomeCredits} credits, and extracting captions from a YouTube
                  video that already has them is free, however many you do.
                </>
              )}
            </p>
          </div>
          <div>
            <div className={`border-2 ${RULE} text-base`}>
              {[
                ["YouTube videos with captions", "Free"],
                ["AI transcription", `${aiPerMin} credit / min · from ${eur(cheapestPerMin)}`],
                ["Chapter summary", `${summaryPer10} credit / 10 min`],
                ["RAG JSON, for vector databases", `${ragPer10} credit / 10 min`],
                ["Every other export", "Included"],
                ["Credit packs", `from ${eur(cheapestPack)}, never expire`],
                ["Subscription", "None"],
              ].map(([k, v], i, arr) => (
                <div
                  key={k}
                  className={`flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 ${i < arr.length - 1 ? `border-b-2 ${RULE}` : ""}`}
                >
                  <span className="text-[var(--fg)]">{k}</span>
                  <strong className="font-bold text-[var(--fg-strong)]">{v}</strong>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row">
              <Link href="/signup" className={BTN_PRIMARY}>
                Start free <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className={`${BTN_SECONDARY} -mt-[2px] sm:mt-0 sm:-ml-[2px]`}>
                See all packs
              </Link>
            </div>
            <p className="mt-8 text-sm text-[var(--fg-muted)]">
              Audio is deleted as soon as transcription finishes, everything runs and is stored in the EU, and
              payment is handled by Stripe.
            </p>
            {/* growth-plan.md §6.2 Onderdeel E: internal links to the three commercial articles. */}
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              More on{" "}
              <Link href="/articles/video-to-text" className="underline hover:text-[var(--fg)]">converting video to text</Link>,{" "}
              <Link href="/articles/audio-to-text" className="underline hover:text-[var(--fg)]">audio to text</Link>, and{" "}
              <Link href="/articles/srt-generator" className="underline hover:text-[var(--fg)]">SRT subtitle generation</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
