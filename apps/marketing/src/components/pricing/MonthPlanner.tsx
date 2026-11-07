"use client"

// "Your month, in minutes" — pricing §02 (2026-11-07). A visitor sets how many hours of AI
// transcription they expect per month and sees, per pack, how long it lasts and what that works out
// to per month — next to a typical subscription, including the honest case where a subscription is
// cheaper. Every number derives from pricing.ts; nothing is typed. Presentation only: no checkout,
// no credit logic.

import { useState } from "react"
import { PACKAGES, CREDIT_COSTS, costInTier, pricePerMinute } from "@indxr/shared/lib/pricing"

// Same reference as the pricing page's break-even line: TurboScribe unlimited, $10/month billed
// yearly (checked 2026-11-06). Kept in one place on the page via this prop.
export function MonthPlanner({ subscriptionPerMonth }: { subscriptionPerMonth: number }) {
  const [hours, setHours] = useState(4)
  const minutes = hours * 60
  const creditsPerMonth = minutes * CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
  const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))
  const ourBest = minutes * cheapestPerMin
  const subscriptionWins = ourBest > subscriptionPerMonth

  const fmt = (n: number) => `€${n.toFixed(2)}`
  const lasts = (credits: number) => {
    const m = credits / creditsPerMonth
    if (m >= 12) return `${Math.floor(m / 12)}+ yr`
    if (m >= 1) return `${m.toFixed(m < 10 ? 1 : 0)} months`
    const d = Math.max(1, Math.round(m * 30))
    return `${d} day${d === 1 ? "" : "s"}`
  }

  return (
    <div className="grid border-2 border-[var(--fg-strong)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="border-b-2 border-[var(--fg-strong)] p-6 sm:p-8 lg:border-b-0 lg:border-r-2">
        <label htmlFor="hours" className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">
          AI transcription per month
        </label>
        <p className="mt-3 text-6xl font-bold tracking-[-0.04em] text-[var(--fg-strong)] tabular-nums">
          {hours}
          <span className="ml-2 text-2xl font-medium tracking-normal text-[var(--fg-subtle)]">
            hour{hours === 1 ? "" : "s"}
          </span>
        </p>
        <input
          id="hours"
          type="range"
          min={1}
          max={30}
          step={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="mt-6 h-2 w-full cursor-pointer accent-[var(--fg-strong)]"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[var(--fg-muted)]">
          <span>1 h</span>
          <span>30 h</span>
        </div>
        <p className="mt-6 font-mono text-sm text-[var(--fg)]">= {creditsPerMonth.toLocaleString("en")} credits a month</p>
        <p className="mt-2 text-sm text-[var(--fg-subtle)]">YouTube videos with captions cost nothing and don&apos;t count here.</p>
      </div>
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--fg-strong)] text-[var(--bg)]">
              <th className="px-4 py-3 text-left font-mono text-xs font-medium uppercase">Pack</th>
              <th className="px-4 py-3 text-right font-mono text-xs font-medium uppercase">Lasts</th>
              <th className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs font-medium uppercase">Per month</th>
            </tr>
          </thead>
          <tbody>
            {PACKAGES.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="px-4 py-3">
                  <span className="font-bold text-[var(--fg-strong)]">{p.name}</span>
                  <span className="block font-mono text-xs text-[var(--fg-muted)] sm:ml-2 sm:inline">€{p.priceEur} · {p.credits.toLocaleString("en")} cr</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[var(--fg)]">{lasts(p.credits)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--fg-strong)]">{fmt(costInTier(creditsPerMonth, p))}</td>
              </tr>
            ))}
            <tr className="bg-[var(--bg-subtle)]">
              <td className="px-4 py-3 text-[var(--fg)]">Subscription</td>
              <td className="px-4 py-3 text-right text-[var(--fg-muted)]">renews</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--fg)]">${subscriptionPerMonth}</td>
            </tr>
          </tbody>
        </table>
        <p
          className={`border-t-2 border-[var(--fg-strong)] px-4 py-4 text-sm font-medium ${
            subscriptionWins ? "bg-[var(--bg)] text-[var(--fg-strong)]" : "bg-[var(--accent)] text-[var(--fg-on-accent)]"
          }`}
          aria-live="polite"
        >
          {subscriptionWins
            ? `At ${hours} hours every month, an unlimited subscription is cheaper. Credits still win if some months are quiet: unused credits never expire.`
            : `At ${hours} hour${hours === 1 ? "" : "s"} a month, credits cost less than a subscription, and a quiet month costs nothing.`}
        </p>
      </div>
    </div>
  )
}
