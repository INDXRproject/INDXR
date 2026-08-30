import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { eur, pct, resolveWindow, type GrowthSummary } from "../adminTypes"
import { DashboardControls } from "../_components/DashboardControls"
import { InfoHint } from "../_components/InfoHint"

export const dynamic = "force-dynamic"

// One funnel stage: headline metric + supporting detail, connected top-down.
function Stage({ step, label, value, sub, info, children }: {
  step: number; label: string; value: string; sub?: string; info?: string; children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-semibold text-fg-muted">{step}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</span>
          {info && <InfoHint text={info} />}
        </div>
        <span className="text-2xl font-bold tabular-nums text-fg-strong">{value}</span>
      </div>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function Metric({ label, value, sub, info }: { label: string; value: string; sub?: string; info?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="flex items-center text-xs uppercase tracking-wide text-fg-muted">{label}{info && <InfoHint text={info} />}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

function SourceBars({ bySource }: { bySource: Record<string, number> }) {
  const entries = Object.entries(bySource).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return <p className="text-xs text-fg-subtle">No signups in this window.</p>
  return (
    <div className="space-y-1.5">
      {entries.map(([src, c]) => (
        <div key={src} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-fg-muted">{src}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(c / total) * 100}%` }} />
          </div>
          <span className="w-6 text-right tabular-nums text-fg">{c}</span>
        </div>
      ))}
    </div>
  )
}

export default async function AdminGrowthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const win = resolveWindow(sp.w)

  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_growth_summary", { p_from: win.from, p_to: win.to })
  const g = data as GrowthSummary | null

  if (!g) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Growth data unavailable.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Growth</h1>
          <p className="text-sm text-fg-muted">
            Of users who signed up in the {win.label} · how far they got · real (external) users only
          </p>
        </div>
        <DashboardControls />
      </div>

      {g.external_total === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface-sunken px-4 py-8 text-center text-sm text-fg-muted">
          No external signups in the {win.label}. Try a wider window (this is a signup cohort — "All" shows everyone).
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Stage step={1} label="Acquisition" value={g.external_total.toLocaleString()} sub={`signups · ${win.label}`}
            info="New non-test accounts created in this window, grouped by where they came from (utm_source, else referrer, else 'direct').">
            <SourceBars bySource={g.acquisition.by_source} />
          </Stage>
          <Stage step={2} label="Activation" value={pct(g.activation.rate)}
            sub={`${g.activation.activated} of ${g.external_total} used a paid feature`}
            info="Share of these signups who spent credits on a paid feature (AI transcription, summary, RAG, or a playlist) — INCLUDING credits spent from the free welcome grant. It measures real product use, not just signing up. Free caption extraction (0 credits) does NOT count. NB this is broader than the campaign's 'first premium action' below (which excludes RAG-only)." />
          <Stage step={3} label="Monetization" value={pct(g.monetization.conversion)}
            sub={`${g.monetization.paying} of ${g.external_total} bought credits`}
            info="Share of these signups who bought credits with real money (a completed Stripe purchase). Free welcome credits do NOT count here — this is paying customers only." />
          <Stage step={4} label="Retention" value={pct(g.retention.repeat_rate)}
            sub={`${g.retention.repeat_buyers} of ${g.monetization.paying} bought again`}
            info="Of the paying customers, the share who made 2 or more separate purchases (repeat buyers ÷ paying customers)." />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Unit economics · {win.label} cohort</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="CAC" value={g.acquisition.cac == null ? "—" : eur(g.acquisition.cac)} sub="ads ÷ new payers (once ads run)"
            info="Customer acquisition cost = ad spend ÷ new paying customers. Shows '—' until ad spend is recorded in opex_expenses. Lags the campaign: a click can take 90–180 days to become a payment." />
          <Metric label="Cost / activation" value={g.acquisition.cost_per_activation == null ? "—" : eur(g.acquisition.cost_per_activation)}
            sub={`ads ÷ ${g.activation.first_activated} activations`}
            info="Ad spend ÷ accounts whose FIRST premium action (AI transcription, summary, or a playlist video past the free three) happened in this window. This is what the campaign optimises on — it lands in days, not months, unlike CAC. '—' until ad spend is recorded." />
          <Metric label="LTV (avg)" value={g.monetization.ltv_avg == null ? "—" : eur(g.monetization.ltv_avg)} sub="avg spend / payer"
            info="Average lifetime value = total money paid ÷ number of paying customers, for this cohort." />
          <Metric label="LTV (total)" value={eur(g.monetization.ltv_total)} sub="sum of purchases"
            info="Sum of all real-money purchases (amount paid) by this cohort." />
          <Metric label="LTV : CAC"
            value={g.acquisition.cac && g.monetization.ltv_avg ? `${(g.monetization.ltv_avg / g.acquisition.cac).toFixed(1)}×` : "—"}
            sub="target ≥ 3×"
            info="How many euros of lifetime value each euro of ad spend buys. Healthy SaaS aims for 3× or higher. Needs CAC (ad spend) to compute." />
        </div>
      </div>

      {g.monetization.paying === 0 && (
        <div className="rounded-xl border border-dashed bg-surface-sunken px-4 py-3 text-sm text-fg-muted">
          No paid conversions in this cohort yet. The funnel is live and fills as real users sign up, activate and buy.
          CAC unlocks once ad spend is recorded in <span className="font-mono text-xs">opex_expenses</span>.
        </div>
      )}

      {/* Activation economy — the campaign optimises on activation, not purchase (ADR-101). */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Activation economy · why we bid on activation, not purchase</h2>
        <p className="mb-3 max-w-3xl text-xs text-fg-subtle">
          Google Ads bids on activation (first premium action), not purchase, for two reasons: freemium
          time-to-paid runs 90–180 days — outside the ad attribution window — and purchase volume is far
          below the ~30 conversions / 30 days Smart Bidding needs. Cost per activation (above) is the live
          steering number; the weekly cohort below shows how activation turns into payment over time.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="Welcome-credit burn & ghost"
            value={g.abuse.welcome_burn_ghost.rate == null
              ? "—"
              : `${pct(g.abuse.welcome_burn_ghost.rate)} (${g.abuse.welcome_burn_ghost.ghosted}/${g.abuse.welcome_burn_ghost.burned})`}
            sub="throwaway-account signal · watch after raising free credits"
            info="DEFINITION (documented here so it isn't reinterpreted later): of accounts at least 7 days old that consumed 80% or more of their welcome-credit grant — the 'burned' denominator — the share that never bought AND never returned, meaning no transcript was created more than 24 hours after signup — the 'ghosted' numerator. Free caption use counts as returning. Raising the welcome grant lifts activation but should be weighed against this abuse rate. Shows '—' until any account has burned its grant." />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Activation → purchase by weekly cohort</h2>
        <p className="mb-3 max-w-3xl text-xs text-fg-subtle">
          Of the accounts that activated in each week (their first premium action), how many have since
          bought credits. A cohort, not a blended ratio — so a slow-but-healthy pattern stays visible and
          a fast-but-dead one is not flattered. Last 12 activation-weeks, independent of the window above.
        </p>
        {g.cohorts.activation_to_purchase.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-surface-sunken px-4 py-6 text-center text-sm text-fg-muted">
            No premium activations recorded yet. Rows appear here as accounts complete their first premium action.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-2 font-medium">Activation week</th>
                  <th className="px-4 py-2 text-right font-medium">Activated</th>
                  <th className="px-4 py-2 text-right font-medium">Purchased</th>
                  <th className="px-4 py-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {g.cohorts.activation_to_purchase.map((c) => (
                  <tr key={c.week} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs tabular-nums">{c.week}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.activated}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.purchased}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.rate == null ? "—" : pct(c.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
