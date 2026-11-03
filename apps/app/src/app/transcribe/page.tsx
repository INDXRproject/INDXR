import { QuickCheckoutPanel } from "@indxr/shared/components/free-tool/QuickCheckoutPanel"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import {
  PACKAGES,
  PER_FILE_EUR_PER_MIN,
  PER_FILE_MIN_EUR,
  formatEurExact,
  pricePerMinute,
} from "@indxr/shared/lib/pricing"
import { EXPORT_MENU } from "@indxr/shared/lib/exportFormats"
import { RedirectIfLoggedIn } from "./RedirectIfLoggedIn"

// Public anonymous entry point for the snelle balie (growth-plan.md §6.2 Onderdeel B: "Bezoeker
// uploadt ... op /transcribe, uploadtab. Er is geen account nodig."). Deliberately OUTSIDE
// /dashboard — middleware.ts gates every /dashboard/* path behind auth, which would make the
// anonymous quick-checkout path unreachable. Logged-in visitors are redirected to the full
// workspace (/dashboard/transcribe) via RedirectIfLoggedIn, a client island that renders nothing.
//
// Server component (no "use client"): brand bar, headline, price line and QuickCheckoutPanel are
// in the server-rendered HTML from the first response — visible at first paint even before any JS
// has loaded or run (growth-plan.md §6.3 mobile-bounce-onderzoek, LOG 2026-10-29/30). Renders
// QuickCheckoutPanel directly, not via AudioTab, whose useAuth().loading gate would delay it.
//
// Desktop pass (2026-11-03, Google Ads is desktop-only since 2-11): the page used to be a bare
// card with no brand and no price until after upload. Every number below renders from pricing.ts /
// exportFormats.ts — never hardcode a price or format list here.

// Cheapest route, always named next to the per-file price (growth-live-status.md: "altijd de
// goedkoopste route noemen, nooit het balie-minimum als vanaf-prijs").
const cheapestPerMin = Math.min(...PACKAGES.map(pricePerMinute))
const formats = [...new Set(EXPORT_MENU.filter((i) => !i.paid).map((i) => i.format))].join(", ")

// Illustrative sample, labelled as such on the page — shows the output format (speaker labels +
// timestamps), not a claim about any customer's file.
const SAMPLE = [
  { t: "00:00:04", s: "Speaker A", text: "Thanks for joining. Can you tell me how your week usually starts?" },
  { t: "00:00:09", s: "Speaker B", text: "Monday is planning. I block the morning and keep meetings for the afternoon." },
  { t: "00:00:17", s: "Speaker A", text: "And when do you do the focused work?" },
]

export default function PublicTranscribePage() {
  return (
    <div className="min-h-screen bg-bg">
      <RedirectIfLoggedIn />
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 md:h-16 flex items-center">
          <a href={marketingHref("/")} className="flex items-center gap-3" aria-label="INDXR.AI home">
            <img src="/logo/indxr-mark-black-transparent.png" alt="" className="dark:hidden h-7 md:h-9 w-auto" />
            <img src="/logo/indxr-mark-white-transparent.png" alt="" className="hidden dark:block h-7 md:h-9 w-auto" />
            <img src="/logo/indxr-wordmark-black-transparent.png" alt="INDXR.AI" className="dark:hidden h-8 md:h-10 w-auto" />
            <img src="/logo/indxr-wordmark-white-transparent.png" alt="INDXR.AI" className="hidden dark:block h-8 md:h-10 w-auto" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-fg mb-2">Transcribe a file</h1>
          <p className="text-sm text-fg-muted mb-1">
            No account needed. See the price, read a free preview of the first part (up to 3 minutes), then pay per file.
          </p>
          <p className="text-sm text-fg">
            {formatEurExact(PER_FILE_EUR_PER_MIN)} per minute, minimum {formatEurExact(PER_FILE_MIN_EUR)} per file.
          </p>
          <QuickCheckoutPanel />
          {/* Cheapest route (credits), placed after the upload so it doesn't compete with the per-file price. */}
          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm">
            <p className="font-semibold text-fg mb-1">Several or long files?</p>
            <p className="text-fg-muted">
              Create a free account and buy credits once — no subscription, they never expire. AI transcription then
              costs from {formatEurExact(cheapestPerMin)} per minute.{" "}
              <a href={marketingHref("/signup")} className="text-[var(--link)] hover:underline">Create a free account</a>
            </p>
          </div>
        </div>

        <aside className="mt-10 lg:mt-0 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-fg-subtle mb-3">Example output</p>
            <div className="space-y-3 font-mono text-xs leading-relaxed">
              {SAMPLE.map((l) => (
                <p key={l.t} className="text-fg">
                  <span className="text-fg-subtle">[{l.t}]</span>{" "}
                  <span className="font-semibold">{l.s}:</span> {l.text}
                </p>
              ))}
            </div>
          </div>
          <ul className="space-y-2 text-sm text-fg-muted">
            <li>Speaker labels and timestamps throughout</li>
            <li>Download as {formats}</li>
            <li>Audio is processed in the EU and deleted after transcription</li>
          </ul>
        </aside>
      </main>
    </div>
  )
}
