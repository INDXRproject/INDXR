import type { Metadata } from "next"
import { Fragment } from "react"
import Link from "next/link"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { JsonLd } from "@/components/seo/JsonLd"
import {
  PACKAGES,
  FREE_TIER,
  CREDIT_COSTS,
  cheapestPackage,
  formatEur,
} from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"

// Commercial comparison landing page (NOT an article — own /alternatives namespace, ADR-105).
// Wedge = the subscription model itself (ADR-105, revised 2026-09-07): you pay for idle months and the
// monthly allowance is the provider's to change; INDXR credits are bought, owned, never expiring, with
// no monthly allowance. Otter's numbers are entered by hand, checked against otter.ai/pricing on a
// stated date (no scraper, ADR-105). Every INDXR number renders from pricing.ts / limits.ts /
// uploadFormats.ts — never hardcoded. Privacy claims are code/config-verified (see
// docs/wiki/operations/privacy-claims-verification.md); nothing unverifiable is asserted.

const OTTER_PRICING_CHECKED = "7 September 2026"
const OTTER_PRICING_URL = "https://otter.ai/pricing"

const perMinute = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const cheapest = cheapestPackage()

export const metadata: Metadata = {
  alternates: { canonical: "/alternatives/otter-ai" },
  title: "An Otter.ai alternative without a monthly plan | INDXR.AI",
  description:
    "An Otter.ai alternative with no monthly plan: buy credits that never expire and pay per minute, " +
    "instead of a subscription with a monthly allowance you can lose. INDXR is not a live meeting tool. " +
    `Otter pricing checked on ${OTTER_PRICING_CHECKED}.`,
  openGraph: {
    type: "website",
    url: "https://indxr.ai/alternatives/otter-ai",
    title: "An Otter.ai alternative without a monthly plan",
    description:
      "With a subscription you pay for the months you do not use, and the monthly allowance is set by " +
      "the provider. With INDXR you buy credits that are yours and never expire, and pay per minute.",
  },
}

// Otter's plans — EXACT figures from otter.ai/pricing, checked on the date above. Do not edit these
// numbers without re-checking the source and updating OTTER_PRICING_CHECKED (ADR-105).
const OTTER_TIERS = [
  {
    name: "Basic",
    price: "Free",
    lines: ["300 transcription minutes a month", "3 audio or video uploads for the account's lifetime"],
  },
  {
    name: "Pro",
    price: "$8.33 per user a month, billed annually ($16.99 monthly)",
    lines: ["1,200 recording minutes a month", "10 uploads per month", "Up to 90 minutes per meeting"],
  },
  {
    name: "Business",
    price: "$19.99 per user a month, billed annually ($30 monthly)",
    lines: ["Unlimited meetings and recordings", "Unlimited uploads", "Up to 4 hours per meeting"],
  },
  {
    name: "Enterprise",
    price: "Price on request",
    lines: ["SSO, SCIM, HIPAA add-on, API"],
  },
]

// Comparison rows. Left cell = Otter, right cell = INDXR. Strictly two data columns so the table stays
// readable at 375px with no horizontal scroll. INDXR values that are numbers come from live code.
const COMPARISON = [
  {
    feature: "Pricing model",
    otter: "A subscription, priced per user per month.",
    indxr: `Pay per minute, no subscription. ${perMinute} credit per minute of audio or video.`,
  },
  {
    feature: "Unused allowance",
    otter: "A monthly allowance that resets. What you do not use is gone, and the allowance is the provider's to set.",
    indxr: "No monthly allowance. Credits are bought, they are yours, and they never expire.",
  },
  {
    feature: "Built for",
    otter: "Live meetings — a bot joins your Zoom, Teams or Meet call and transcribes as people talk.",
    indxr: "Working from a recording you already have: an interview, a lecture, a podcast, a video.",
  },
  {
    feature: "File uploads",
    otter: "Basic: 3 for the account's lifetime. Pro: 10 per month. Only Business makes uploads unlimited.",
    indxr: "No upload limit. You pay per minute of what you transcribe, nothing for the upload itself.",
  },
  {
    feature: "Free tier",
    otter: "300 minutes a month for live meetings, and 3 uploads in total.",
    indxr: `${FREE_TIER.WELCOME_CREDITS} welcome credits, enough for ${FREE_TIER.WELCOME_CREDITS} minutes, then you buy only what you need.`,
  },
  {
    feature: "Length per file",
    otter: "Pro: up to 90 minutes per meeting. Business: up to 4 hours per meeting.",
    indxr: `Up to ${MAX_TRANSCRIPTION_HOURS} hours per file, up to ${UPLOAD_MAX_FILE_MB}MB.`,
  },
  {
    feature: "Live transcription",
    otter: "Yes, text appears during the conversation.",
    indxr: "No. INDXR works after the recording, not while it is happening.",
  },
  {
    feature: "Speaker labels",
    otter: "Yes.",
    indxr: "Yes, and you rename a speaker once to update the whole transcript.",
  },
  {
    feature: "Team workspaces",
    otter: "Yes, with shared workspaces and admin controls.",
    indxr: "No. INDXR is built for one person.",
  },
]

// Where INDXR is the genuinely better choice. Placed ABOVE the Otter section so the page ends on the
// rule the reader can apply. Every claim here is demonstrably true; numbers render from live code.
const INDXR_WINS = [
  "Your use is irregular. A month with nothing to transcribe, then ten recordings in a week. A subscription bills you through the quiet months; credits sit and wait, and you spend them only when you transcribe something.",
  "You already have a stack of recordings. Interviews, lectures, podcasts you want the text of. This is where an upload limit hits on the first day, and INDXR has none.",
  `Your files are long. INDXR transcribes up to ${MAX_TRANSCRIPTION_HOURS} hours in a single file, against Otter's 90 minutes per meeting on Pro.`,
  "You want the transcript as a document, not a conversation about it. INDXR gives you an editable transcript you correct once and export in several formats, rather than a chat interface over the recording.",
]

// Where Otter is genuinely the better choice. Not optional (ADR-105): a comparison page that only lists
// wins reads as a sales sheet. The first point also does the "not for you" filtering the meeting-tool
// searcher needs.
const OTTER_WINS = [
  "You need the text while the conversation is happening. Live captions for a deaf or hard-of-hearing participant, or a reply you have to form during a sales call, need transcription in real time. INDXR cannot do that.",
  "You do not want to record anything yourself. Otter slips in as a bot on your Zoom, Teams or Meet call and captures it for you. With INDXR you supply the recording.",
  "You work as a team. Otter has shared workspaces and admin controls. INDXR is for a single person.",
  "You run short, frequent calls. Otter's free tier gives 300 minutes a month for live meetings, which is generous and probably enough for that pattern.",
]

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://indxr.ai" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Otter.ai alternative",
      item: "https://indxr.ai/alternatives/otter-ai",
    },
  ],
}

export default function OtterAlternativePage() {
  return (
    <>
      <JsonLd schemas={[breadcrumbSchema]} />

      <div className="relative min-h-screen bg-[var(--bg)]">
        <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />

        <div className="relative container mx-auto px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Hero */}
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
              Comparison
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--fg-strong)] sm:text-4xl">
              An Otter.ai alternative without a monthly plan
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[var(--fg-muted)]">
              A subscription charges you every month, including the months you transcribe nothing, and
              the monthly allowance that comes with it is set by the provider, not by you. INDXR works
              the other way round: you buy credits, they are yours, they never expire, and there is no
              monthly allowance that can change underneath you.
            </p>

            <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/signup">
                <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-colors hover:bg-[var(--accent-hover)]">
                  Create a free account
                </button>
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline"
              >
                See pricing →
              </Link>
            </div>

            {/* Not-a-meeting-tool filter — stated early and plainly so someone looking to replace a
                meeting bot sees within seconds that this is not that tool and leaves. */}
            <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-5">
              <p className="leading-relaxed text-[var(--fg)]">
                <strong className="font-semibold">INDXR is not a live meeting notetaker.</strong> There
                is no bot that joins your Zoom, Teams or Meet calls. You give it a recording you already
                have and it transcribes that. If what you want is to replace the bot in your calls, Otter
                is the right tool and this one is not.
              </p>
            </div>

            {/* The core argument — the subscription pattern; the upload limit as one example of it */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">No monthly plan</h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              With INDXR you pay {perMinute} credit per minute of what you actually transcribe, and
              nothing in a month you do not use the site. Credits you have bought stay on your account
              until you spend them, so a balance you buy today is still there next year, and there is no
              monthly allowance to run down or to be revised. If you have ever watched an allowance
              shrink or paid for months you did not use, that is the pattern this avoids.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              The upload limit is the same pattern in miniature. Otter&apos;s free tier has no meeting
              bot, so a free user has to upload recordings, and Otter Basic allows 3 audio or video
              uploads for the whole lifetime of the account, not 3 a month. Pro raises that to 10 per
              month; uploads only become unlimited on Business. INDXR has no upload limit at any tier:
              you pay per minute of what you transcribe, and nothing for the upload itself.
            </p>

            {/* Comparison table — two data columns, mobile-first */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">Side by side</h2>
            <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-elevated)]">
                    <th className="w-1/2 border-b border-[var(--border)] px-3 py-3 text-left font-semibold text-[var(--fg-strong)] sm:px-4">
                      Otter
                    </th>
                    <th className="w-1/2 border-b border-l border-[var(--border)] px-3 py-3 text-left font-semibold text-[var(--fg-strong)] sm:px-4">
                      INDXR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <Fragment key={row.feature}>
                      <tr>
                        <th
                          colSpan={2}
                          className="border-b border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)] sm:px-4"
                        >
                          {row.feature}
                        </th>
                      </tr>
                      <tr className="align-top">
                        <td className="border-b border-[var(--border-subtle)] px-3 py-3 leading-relaxed text-[var(--fg-muted)] sm:px-4">
                          {row.otter}
                        </td>
                        <td className="border-b border-l border-[var(--border-subtle)] px-3 py-3 leading-relaxed text-[var(--fg)] sm:px-4">
                          {row.indxr}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Otter pricing — exact, dated */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">Otter&apos;s pricing</h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              These are Otter&apos;s published plans. Each paid tier is a monthly subscription, and the
              allowance and upload count are what change between them.
            </p>
            <div className="mt-5 space-y-3">
              {OTTER_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="font-semibold text-[var(--fg-strong)]">{tier.name}</span>
                    <span className="text-sm text-[var(--fg-muted)]">{tier.price}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--fg-muted)]">
                    {tier.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--fg-subtle)]">
              Otter pricing checked on {OTTER_PRICING_CHECKED}, from{" "}
              <a
                href={OTTER_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--link)] underline-offset-2 hover:underline"
              >
                otter.ai/pricing
              </a>
              . We check this by hand rather than scrape it, so a price can lag reality for a short
              while; if you spot a change, the source link above is the authority.
            </p>

            {/* INDXR pricing — rendered from pricing.ts */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">INDXR&apos;s pricing</h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              No subscription. You buy credits once and spend {perMinute} credit per minute of audio or
              video you transcribe. Credits never expire, and there is no upload limit. Starting at{" "}
              {formatEur(cheapest.priceEur)}.
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-elevated)]">
                    <th className="border-b border-[var(--border)] px-3 py-3 text-left font-semibold text-[var(--fg-strong)] sm:px-4">
                      Package
                    </th>
                    <th className="border-b border-l border-[var(--border)] px-3 py-3 text-left font-semibold text-[var(--fg-strong)] sm:px-4">
                      Price
                    </th>
                    <th className="border-b border-l border-[var(--border)] px-3 py-3 text-left font-semibold text-[var(--fg-strong)] sm:px-4">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PACKAGES.map((pkg) => (
                    <tr key={pkg.id} className="align-top">
                      <td className="border-b border-[var(--border-subtle)] px-3 py-3 font-medium text-[var(--fg)] sm:px-4">
                        {pkg.name}
                      </td>
                      <td className="whitespace-nowrap border-b border-l border-[var(--border-subtle)] px-3 py-3 text-[var(--fg-muted)] sm:px-4">
                        {formatEur(pkg.priceEur)}
                      </td>
                      <td className="whitespace-nowrap border-b border-l border-[var(--border-subtle)] px-3 py-3 text-[var(--fg-muted)] sm:px-4">
                        {pkg.credits.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-[var(--fg-subtle)]">
              Prices include VAT. For the full breakdown and what credits cost per action, see the{" "}
              <Link href="/pricing" className="text-[var(--link)] underline-offset-2 hover:underline">
                pricing page
              </Link>
              .
            </p>

            {/* Privacy — every claim verified against the actual configuration, not the wiki. No blanket
                "all EU" line: only the components confirmed EU are named as such. */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">
              Privacy and how your recording is handled
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              Otter&apos;s most common privacy complaint is about a bot that sits in a call and records
              people who did not choose to be there. INDXR has no bot. You supply a recording you already
              have, so no one is captured by us without your involvement.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">What happens to the file you upload:</p>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                <span>
                  We do not keep it. On our side the upload exists only as a temporary file while the job
                  runs, and it is deleted when the job finishes; a file left behind by an interrupted job
                  is cleared on the next restart. We never store a copy of your audio. Only the
                  transcript text is saved, to your library.
                </span>
              </li>
              <li className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                <span>
                  It is transcribed by our provider, AssemblyAI, on its EU endpoint; AI summaries run on
                  AssemblyAI&apos;s EU model gateway.
                </span>
              </li>
              <li className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                <span>
                  Your transcripts and account data are stored in our database in the EU, hosted in
                  Ireland.
                </span>
              </li>
              <li className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                <span>Product analytics run on an EU instance and set no tracking cookies.</span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              One thing is yours, not ours: because you provide the recording, getting the consent of the
              people in it is your responsibility. Recording a conversation legally needs the consent of
              those taking part in many places, and securing that is down to you. The full detail is in
              our{" "}
              <Link href="/privacy" className="text-[var(--link)] underline-offset-2 hover:underline">
                privacy policy
              </Link>
              .
            </p>

            {/* Where INDXR wins — placed before the Otter section so the page ends on the rule */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">
              Where INDXR is the better choice
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              INDXR fits some ways of working much better than a subscription meeting tool.
            </p>
            <ul className="mt-5 space-y-4">
              {INDXR_WINS.map((point) => (
                <li key={point} className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Honesty section — where Otter wins */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">
              Where Otter is the better choice
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              INDXR is not the right tool for everyone, and Otter does several things it does not.
            </p>
            <ul className="mt-5 space-y-4">
              {OTTER_WINS.map((point) => (
                <li key={point} className="flex gap-3 leading-relaxed text-[var(--fg-muted)]">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* The one rule */}
            <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-5">
              <p className="leading-relaxed text-[var(--fg)]">
                A rule you can apply yourself: if you need the text while the conversation is running,
                use Otter. If you need the text afterwards, from a recording, use INDXR.
              </p>
            </div>

            {/* Closing CTA */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">
              Try it on your own recording
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              A free account includes {FREE_TIER.WELCOME_CREDITS} credits, enough for{" "}
              {FREE_TIER.WELCOME_CREDITS} minutes of audio, with no card and no subscription. There is
              no upload limit to run into, and if you buy credits afterwards they do not expire.
            </p>
            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/signup">
                <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-colors hover:bg-[var(--accent-hover)]">
                  Create a free account
                </button>
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline"
              >
                See pricing →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
