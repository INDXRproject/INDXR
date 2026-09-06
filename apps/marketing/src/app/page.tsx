import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Puzzle, Infinity as InfinityIcon, Library, Files } from "lucide-react"
import { HeroImage } from "@/components/marketing/HeroImage"
import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { HomeClipVideo } from "@/components/marketing/HomeClipVideo"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { JsonLd } from "@/components/seo/JsonLd"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { EXPORT_FORMAT_COUNT, EXPORT_DOWNLOAD_COUNT } from "@indxr/shared/lib/exportFormats"

export const metadata: Metadata = {
  title: "INDXR.AI — Accurate transcripts from audio, video and YouTube",
  description:
    "Upload a recording or paste a link. Get an accurate, speaker-labelled transcript you can edit, search and export. Credits, no subscription — they never expire.",
  alternates: { canonical: "/" },
}

// Homepage structured data. Two distinct @types (Organization + SoftwareApplication), never two of
// the same type on this page. Both carry name "INDXR.AI" and a transcription-first description so
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
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "INDXR.AI",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: "https://indxr.ai",
    description:
      "Upload a recording or paste a link and get an accurate, speaker-labelled transcript you can edit, search and export. Credits, no subscription — they never expire.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free for basic use. Credits required for AI transcription.",
    },
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

// One consistent section separator across the whole page: a hairline top-to-next border
// (--border-subtle) over a uniform --bg surface, with uniform vertical padding. No alternating
// background colours, no ad-hoc dividers.
const SECTION = "w-full border-b border-[var(--border-subtle)] bg-[var(--bg)]"
// One shared content container so every section lines up on desktop: same max-width, same
// horizontal padding, same vertical rhythm. The hero is the deliberate full-bleed exception.
// Single-column prose sections keep their reading width with an inner PROSE wrapper that is
// LEFT-aligned inside CONTENT — so their left edge still matches the wider grid sections.
const CONTENT = "container mx-auto max-w-5xl px-4 py-20 lg:py-24"
const PROSE = "max-w-3xl"

const usps = [
  {
    icon: Puzzle,
    heading: "No plugin, ever breaks.",
    body: "Works straight from your browser. No extension to install, nothing that stops working when YouTube changes its interface.",
  },
  {
    icon: InfinityIcon,
    heading: "Credits never expire.",
    body: "No subscription. Buy once, use whenever you need to.",
  },
  {
    icon: Library,
    heading: "One library, not a downloads folder.",
    body: "Every transcript stays searchable, months later, in the same place.",
  },
  {
    icon: Files,
    heading: "Get every format, one price.",
    body: `${EXPORT_FORMAT_COUNT} formats, ${EXPORT_DOWNLOAD_COUNT} downloads, all included.`,
  },
]

export default async function LandingPage() {
  // Auth-aware section copy (point 8): a logged-in visitor already has an account, so the
  // "a free account comes with 50 credits" promise is wrong for them. The ANONYMOUS copy is the
  // verified Ads-landing variant and is left byte-for-byte unchanged; only the logged-in branch differs.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loggedIn = !!user

  return (
    <>
      <JsonLd schemas={homeSchemas} />
      {/* Hero */}
      {/* Height scales with WIDTH from lg up: lg:min-h-[42vw] keeps the rendered container aspect-ratio a
          constant ~2.38:1 (1 / 0.42) on every wide screen, instead of a fixed 555px that got ever more
          extreme (2.6:1 at 1440, 3.5:1 at 1920) and cropped a growing slice of the 1.851:1 photo. Below lg
          the content-driven height wins (min-h is a floor, not a fixed height), so the <768px mobile 4:5
          view is untouched. lg:flex + justify/items-center vertically centres the text in the taller box so
          it stays balanced (never top-heavy); pt/pb remain as header-clearance padding. */}
      <section className="relative w-full overflow-hidden bg-[var(--bg)] pt-[110px] pb-10 lg:pt-[76px] lg:pb-14 lg:flex lg:flex-col lg:items-center lg:justify-start min-[1024px]:min-h-[49rem] min-[1867px]:min-h-[42vw]">
        <HeroImage />
        {/* No layer sits over the photo in EITHER theme — the dark readability scrim and the amber top
            glow that used to darken/tint the image here have been removed (they burned the dark image's
            bottom to black). The image renders raw; text contrast comes only from the per-glyph
            text-shadow on the text below. See LESSONS 2026-09-06. */}
        <div className="container relative z-10 mx-auto flex flex-col items-center px-4 text-center">
          {/* Light-mode contrast is carried by a per-glyph --bg halo (text-shadow), NOT a --bg layer over
              the photo. The halo is invisible over the bright sky and lifts the dark text only where it
              crosses the darker mullions/laptop — it touches the letters, never the image. DARK ONLY: no
              shadow (the dark scrim already carries contrast there), so dark is unchanged. */}
          {/* Halo applies in BOTH themes (was light-only). After moving the text up, the h1 sits over the
              bright milky-way core in dark mode; the --bg halo (dark in dark) is a text-side fix (no layer
              over the image) that keeps the white h1 legible there. Light halo unchanged. */}
          <h1 className="mb-6 max-w-4xl text-4xl font-[800] leading-[1.1] tracking-[-0.03em] text-[var(--fg-strong)] sm:text-5xl lg:text-6xl [text-shadow:0_0_4px_var(--bg),0_0_10px_var(--bg),0_1px_2px_var(--bg)] dark:[text-shadow:0_0_6px_var(--bg),0_0_14px_var(--bg),0_2px_3px_var(--bg)]">
            Accurate transcripts from your audio, video and YouTube links
          </h1>
          <p className="mx-auto mb-4 max-w-[720px] text-lg leading-relaxed text-[var(--fg)] sm:text-xl [text-shadow:0_0_3px_var(--bg),0_0_6px_var(--bg),0_1px_2px_var(--bg)] dark:[text-shadow:none]">
            Upload a recording or paste a link. INDXR gives you a clean transcript with speaker labels,
            ready to edit, search and export.
          </p>
          <p className="mb-10 text-base font-medium text-[var(--fg)] [text-shadow:0_0_3px_var(--bg),0_0_6px_var(--bg),0_1px_2px_var(--bg)] dark:[text-shadow:none]">
            Pay per minute, no subscription, and credits never expire.
          </p>
          <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <Link href="#try" className="w-full sm:w-auto">
              <button className="h-12 w-full cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all duration-150 ease-out hover:bg-[var(--accent-hover)] active:scale-[0.97] sm:w-auto">
                Try it now, no account <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="h-12 w-full cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]/70 px-8 py-3 text-base font-medium text-[var(--fg)] transition-all duration-150 ease-out hover:bg-[var(--surface)] sm:w-auto">
                See pricing
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Try it — the live tool, directly below the fold */}
      <section id="try" className={`${SECTION} scroll-mt-24`}>
        <div className={CONTENT}>
          <h2 className="mb-3 text-center text-2xl font-bold text-[var(--fg)] sm:text-3xl">
            Paste a link and see for yourself
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-[var(--fg-subtle)]">
            {loggedIn ? (
              <>
                Paste a link or upload a recording and see the transcript for yourself. Playlists and file
                uploads open in the app.
              </>
            ) : (
              <>
                No account, no card. Paste a link or upload a recording and see the transcript for yourself.
                A free account comes with {welcomeCredits} credits, enough for {welcomeMinutes} minutes of AI
                transcription.
              </>
            )}
          </p>
          <FreeToolEmbed />
        </div>
      </section>

      {/* See it in action — the product walkthrough, moved up to sit right after the tool: the video
          shows in motion what the tool just promised, before the feature sections. Same shared
          CONTENT width as every other section (click to play, no autoplay). */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <h2 className="mb-6 text-2xl font-bold text-[var(--fg)] sm:text-3xl">See it in action</h2>
          <HomeClipVideo />
        </div>
      </section>

      {/* Why INDXR — four USP lines */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {usps.map((u) => {
              const Icon = u.icon
              return (
                <div key={u.heading}>
                  <Icon className="mb-3 h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
                  <h3 className="mb-1.5 font-semibold text-[var(--fg)]">{u.heading}</h3>
                  <p className="text-sm leading-relaxed text-[var(--fg-subtle)]">{u.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <div className={PROSE}>
            <h2 className="mb-4 text-2xl font-bold text-[var(--fg)] sm:text-3xl">
              The problem is not getting the text. It is what happens after
            </h2>
            <p className="mb-4 leading-relaxed text-[var(--fg-subtle)]">
              You can find the words of one video in a dozen places. What you cannot find is all of them
              together, in the same format, still searchable next month.
            </p>
            <p className="leading-relaxed text-[var(--fg-subtle)]">
              That is what INDXR is. Not a converter you use once and forget, but the place your sources
              live: every transcript in one library, with the same structure, the same export formats and
              the same search across all of them.
            </p>
          </div>
        </div>
      </section>

      {/* What people bring to it */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <h2 className="mb-10 text-2xl font-bold text-[var(--fg)] sm:text-3xl">What people bring to it</h2>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">A course you want to read.</strong> Drop in a
                  playlist and get every lecture as text, each with a chapter summary you can skim before
                  deciding what to reread. Export the lot as Markdown and your notes app has the whole
                  course in it.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Research interviews and source material.</strong>{" "}
                  Speakers are separated automatically and you rename them to who they actually are, so a
                  transcript reads as a conversation rather than a wall. Timestamps link back to the
                  second something was said, so every quote is one click from its source, and the whole
                  set stays together in one collection.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">A video that needs subtitles.</strong> SRT and VTT
                  built to the broadcast standard rather than chopped on character count, ready to drop
                  into any editor.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Recordings you keep coming back to.</strong> Your
                  own files, up to {maxHours} hours each, transcribed and stored next to everything else.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Text you want to build on.</strong> Chunked JSON
                  with timestamps and deep links, made for feeding a vector database instead of
                  reformatting by hand.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <DocsFigure
                src="/docs/screenshots/justice-summary.png"
                alt="A lecture open on its Summary tab: an AI summary of the Harvard 'Justice' lecture, with an overview paragraph beneath the heading, inside the app with its sidebar."
                caption="A playlist becomes lectures you can skim: each one gets a chapter summary."
              />
            </div>
          </div>
        </div>
      </section>

      {/* What you get from a single transcript */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <h2 className="mb-2 text-2xl font-bold text-[var(--fg)] sm:text-3xl">
            What you get from a single transcript
          </h2>
          <p className="mb-10 text-[var(--fg-muted)]">More than the words.</p>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Read it properly.</strong> Real paragraphs instead
                  of two-second fragments, with timestamps on or off.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Know who said what.</strong> Automatic speaker
                  separation, with names you set yourself.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Get the shape of it.</strong> A summary broken into
                  chapters, each with its own timestamp and worked-out notes.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Edit either of them.</strong> Both the transcript
                  and the summary have an editor, and your edited version is kept alongside the original
                  rather than replacing it.
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-[var(--fg-subtle)]">
                  <strong className="text-[var(--fg)]">Take it anywhere.</strong> {EXPORT_FORMAT_COUNT}{" "}
                  formats, {EXPORT_DOWNLOAD_COUNT} downloads. Plain text, Markdown with front matter, CSV,
                  JSON, SRT, VTT. All of them included.
                </p>
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
        </div>
      </section>

      {/* Your library */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-[var(--fg)] sm:text-3xl">
                Your library, not your downloads folder
              </h2>
              <p className="mb-4 leading-relaxed text-[var(--fg-subtle)]">
                Everything you transcribe stays. Search across all of it, filter it, sort it, group it
                into collections per project or course. Export a whole collection at once as a zip.
              </p>
              <p className="leading-relaxed text-[var(--fg-subtle)]">
                The transcript you made in March is still there in September, in the same format as the
                one you made today.
              </p>
            </div>
            <DocsFigure
              src="/docs/screenshots/justice-library.png"
              alt="The library: a search box and filter controls above rows of saved transcripts, the Harvard 'Justice' lecture at the top, with named collections in the sidebar."
              caption="Search, filter, and collections turn a list into an organised library."
            />
          </div>
        </div>
      </section>

      {/* What it costs */}
      <section className={SECTION}>
        <div className={CONTENT}>
          <div className={PROSE}>
          <h2 className="mb-4 text-2xl font-bold text-[var(--fg)] sm:text-3xl">What it costs</h2>
          <p className="mb-8 leading-relaxed text-[var(--fg-subtle)]">
            No subscription. You buy credits, you spend them when you need them, and they never expire.
            Come back after six months and they are still there.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">YouTube videos with captions</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">Free, no limit</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">AI transcription</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">{aiPerMin} credit per minute</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">Chapter summary</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">
                    {summaryPer10} credit per 10 minutes of video
                  </td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">RAG JSON, for vector databases</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">
                    {ragPer10} credit per 10 minutes of video, and the only export that costs anything
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">Every other export</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">Included</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-[var(--fg-subtle)]">
            {loggedIn ? (
              <>Extracting captions from a YouTube video that already has them is free, however many you do.</>
            ) : (
              <>
                A free account starts with {welcomeCredits} credits — and extracting captions from a YouTube
                video that already has them is free, however many you do.
              </>
            )}
          </p>

          <p className="mt-8 text-sm text-[var(--fg-muted)]">
            Audio is deleted as soon as transcription finishes, everything runs and is stored in the EU,
            and payment is handled by Stripe.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/signup">
              <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
                Start free <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              See pricing
            </Link>
          </div>
          </div>
        </div>
      </section>
    </>
  )
}
