import Link from "next/link"
import { FREE_TIER, CREDIT_COSTS } from "@indxr/shared/lib/pricing"
import { LIBRARY_STORAGE_BASE_MB } from "@indxr/shared/lib/storage"

// Auth pages, stijl B (2026-11-07): the form on paper on the right, an ink panel on the left that
// says what the account is for. Desktop only for the panel — on mobile the form comes first and the
// panel's list follows below it, so nothing pushes the fields down. Every number from a constant.

const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

const SIGNUP_POINTS: Array<[string, string]> = [
  [`${FREE_TIER.WELCOME_CREDITS} credits`, `${welcomeMinutes} minutes of AI transcription, on us`],
  ["Captions free", "every YouTube video that has them"],
  ["A library", `${LIBRARY_STORAGE_BASE_MB} MB, collections, search in the text itself`],
  ["Every export", "TXT, Markdown, SRT, VTT, CSV, JSON"],
]

const LOGIN_POINTS: Array<[string, string]> = [
  ["Your library", "every transcript where you left it"],
  ["Your credits", "they never expire"],
]

export function AuthSplit({ variant, children }: { variant: "signup" | "login"; children: React.ReactNode }) {
  const points = variant === "signup" ? SIGNUP_POINTS : LOGIN_POINTS
  const heading = variant === "signup" ? "Everything you've heard, on record." : "Welcome back."
  return (
    <div className="auth-shell min-h-screen bg-bg pt-16">
      <div className="grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside className={`${variant === "login" ? "hidden lg:flex" : ""} order-2 border-t-2 border-fg-strong bg-fg-strong px-6 py-12 text-bg sm:px-10 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:border-t-0 lg:px-14 lg:py-16`}>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.08em] opacity-80">
              {variant === "signup" ? "Free account" : "INDXR.AI"}
            </p>
            <p className="mt-6 max-w-md text-4xl font-bold leading-[0.98] tracking-[-0.04em] sm:text-5xl">{heading}</p>
            <dl className="mt-10 max-w-md border-t-2 border-bg">
              {points.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-bg/40 py-3">
                  <dt className="font-mono text-sm font-bold">{k}</dt>
                  <dd className="text-sm opacity-80">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-12 hidden max-w-md border-2 border-bg lg:block">
            {/* Public-domain example text only (1962 Rice University address), same as the homepage. */}
            <p className="border-b-2 border-bg px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em]">Speeches · Rice University, 1962</p>
            <p className="px-4 py-4 text-sm leading-relaxed">
              <span className="mr-3 font-mono text-xs opacity-60">¶3</span>
              We choose to go to the Moon in this decade and do the other things.
            </p>
          </div>
          <p className="mt-8 hidden font-mono text-xs opacity-60 lg:block">
            No card needed. <Link href="/pricing" className="underline underline-offset-4">Pricing</Link>
          </p>
        </aside>
        <div className="order-1 flex items-center justify-center px-4 py-12 lg:order-2">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
