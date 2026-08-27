import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { HeroImage } from "@/components/marketing/HeroImage"
import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { EXPORT_FORMAT_COUNT, EXPORT_DOWNLOAD_COUNT } from "@indxr/shared/lib/exportFormats"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

// Every number on this page renders from a constant:
const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const maxHours = MAX_TRANSCRIPTION_HOURS
const aiPerMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const summaryPer10 = CREDIT_COSTS.AI_SUMMARY_PER_10MIN
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative w-full overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] pt-[110px] pb-20 lg:pt-[150px] lg:pb-28">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.08)_0%,transparent_70%),var(--bg)] pointer-events-none" />
        <HeroImage />
        <div className="container relative z-10 mx-auto flex flex-col items-center px-4 text-center">
          <h1 className="mb-6 max-w-4xl text-4xl font-[800] leading-[1.1] tracking-[-0.03em] text-[var(--fg)] sm:text-5xl lg:text-6xl">
            One library for everything you need to read instead of watch
          </h1>
          <p className="mx-auto mb-4 max-w-[720px] text-lg leading-relaxed text-[var(--fg-subtle)] sm:text-xl">
            Lectures, interviews, podcasts, your own recordings. INDXR turns them into accurate text you
            can search, summarise, edit and export, and keeps them in one place instead of scattered
            across downloads and tabs.
          </p>
          <p className="mb-10 text-base font-medium text-[var(--fg)]">
            Pay per minute, no subscription, and credits never expire.
          </p>
          <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <Link href="#try" className="w-full sm:w-auto">
              <button className="h-12 w-full cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all duration-150 ease-out hover:bg-[var(--accent-hover)] active:scale-[0.97] sm:w-auto">
                Try it now, no account <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="h-12 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-8 py-3 text-base font-medium text-[var(--fg)] transition-all duration-150 ease-out hover:bg-[var(--surface)] sm:w-auto">
                See pricing
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Try it — the live tool, directly below the fold */}
      <section id="try" className="w-full scroll-mt-24 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-3 text-center text-2xl font-bold text-[var(--fg)] sm:text-3xl">
            Paste a link and see for yourself
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-[var(--fg-subtle)]">
            No account, no card. Any video that already has captions is free to extract, however many you
            do. To try the paid side, a free account comes with {welcomeCredits} credits, which is enough
            for {welcomeMinutes} minutes of AI transcription.
          </p>
          <FreeToolEmbed />
        </div>
      </section>

      {/* The problem */}
      <section className="w-full border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="container mx-auto max-w-3xl px-4 py-16">
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
      </section>

      {/* What people bring to it */}
      <section className="w-full border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto max-w-5xl px-4 py-16">
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
            <DocsFigure
              src="/docs/screenshots/summary-chapter.png"
              alt="A chapter of an AI summary: a heading, a timestamp, and worked-out notes underneath, generated from a lecture transcript."
              caption="A playlist becomes lectures you can skim: each one gets a chapter summary."
            />
          </div>
        </div>
      </section>

      {/* What you get from a single transcript */}
      <section className="w-full border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="container mx-auto max-w-5xl px-4 py-16">
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
                src="/docs/screenshots/transcript-speakers.png"
                alt="A transcript in the reader: text in real paragraphs with speaker labels down the left and clickable timestamps."
                caption="Paragraphs, not fragments, with speakers separated and named."
              />
              <DocsFigure
                src="/docs/screenshots/summary-edit.png"
                alt="The summary open in the editor, with a formatting toolbar and chapter headings that keep their timestamps."
                caption="Edit the transcript or the summary; your version is kept next to the original."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Your library */}
      <section className="w-full border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto max-w-5xl px-4 py-16">
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
              src="/docs/screenshots/library-list.png"
              alt="The library: rows of saved transcripts with titles, durations and source badges, plus search and filter controls."
              caption="Every transcript in one place, searchable and grouped into collections."
            />
          </div>
        </div>
      </section>

      {/* What it costs */}
      <section className="w-full bg-[var(--bg-subtle)]">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-4 text-2xl font-bold text-[var(--fg)] sm:text-3xl">What it costs</h2>
          <p className="mb-8 leading-relaxed text-[var(--fg-subtle)]">
            No subscription. You buy credits, you spend them when you need them, and they never expire.
            Come back after six months and they are still there.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">YouTube videos with captions</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">Free, no limit</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">AI transcription</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">{aiPerMin} credit per minute</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4 align-top text-[var(--fg)]">Chapter summary</td>
                  <td className="py-3 align-top text-[var(--fg-subtle)]">
                    {summaryPer10} credit per 10 minutes of video
                  </td>
                </tr>
                <tr className="border-b border-[var(--border)]">
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
            A free account starts with {welcomeCredits} credits.
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
      </section>
    </>
  )
}
