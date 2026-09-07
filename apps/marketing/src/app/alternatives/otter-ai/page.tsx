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
// Otter's numbers are entered by hand, checked against otter.ai/pricing on a stated date (no scraper,
// ADR-105). Every INDXR number below renders from pricing.ts / limits.ts / uploadFormats.ts — never
// hardcoded here.

const OTTER_PRICING_CHECKED = "7 September 2026"
const OTTER_PRICING_URL = "https://otter.ai/pricing"

const perMinute = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const cheapest = cheapestPackage()

export const metadata: Metadata = {
  alternates: { canonical: "/alternatives/otter-ai" },
  title: "Otter.ai alternative for uploaded recordings | INDXR.AI",
  description:
    "An Otter.ai alternative for people who upload recordings rather than run live meetings. " +
    "No upload limit, pay per minute, and credits that never expire. Otter pricing checked on " +
    `${OTTER_PRICING_CHECKED}.`,
  openGraph: {
    type: "website",
    url: "https://indxr.ai/alternatives/otter-ai",
    title: "Otter.ai alternative for uploaded recordings",
    description:
      "Otter is built for live meetings. If you upload recordings, the limit you hit first is the " +
      "number of uploads, not the number of minutes. INDXR has no upload limit and credits never expire.",
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
    feature: "Pricing model",
    otter: "A subscription, priced per user per month.",
    indxr: `Pay per minute, no subscription. ${perMinute} credit per minute of audio or video.`,
  },
  {
    feature: "Unused allowance",
    otter: "Minutes reset every month. What you do not use is gone.",
    indxr: "Credits never expire. Buy once, use whenever.",
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

// Where Otter is genuinely the better choice. This section is not optional (ADR-105): a comparison
// page that only lists wins reads as a sales sheet and loses the reader's trust.
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
              An Otter.ai alternative for people who work from recordings
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[var(--fg-muted)]">
              Otter is built for live meetings. If your work starts with a file you already have, a
              recorded interview, a lecture, a podcast, a video, the limit you hit first is not the
              number of minutes. It is the number of uploads Otter lets you make.
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

            {/* The core argument */}
            <h2 className="mt-14 text-2xl font-bold text-[var(--fg-strong)]">
              The upload limit, not the minute limit
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              Otter Basic gives you 3 audio or video uploads for the whole lifetime of the account, not
              3 a month. Pro raises that to 10 per month. Uploads only become unlimited on Business. For
              someone who transcribes recordings, that is not a difference in price. It is a wall: once
              you have used your uploads, the minutes you are paying for do not help.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--fg)]">
              INDXR has no upload limit. You pay {perMinute} credit per minute of what you transcribe,
              and nothing for the upload itself. There is no subscription, and credits never expire, so
              a balance you buy today is still there next year. Otter&apos;s minutes reset every month,
              and what you do not use is gone.
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
              These are Otter&apos;s published plans. The figure to read for uploaded recordings is not
              the price, it is the upload allowance on each tier.
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
