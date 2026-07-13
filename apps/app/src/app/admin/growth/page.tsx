import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { eur, pct, type GrowthSummary } from "../adminTypes"

// One funnel stage: headline metric + supporting detail, connected top-down.
function Stage({
  step, label, value, sub, children,
}: {
  step: number
  label: string
  value: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-semibold text-fg-muted">
            {step}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-fg-strong">{value}</span>
      </div>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

function SourceBars({ bySource }: { bySource: Record<string, number> }) {
  const entries = Object.entries(bySource).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return <p className="text-xs text-fg-subtle">No signups yet.</p>
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

export default async function AdminGrowthPage() {
  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_growth_summary")
  const g = data as GrowthSummary | null

  if (!g) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Growth data unavailable.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth</h1>
        <p className="text-sm text-fg-muted">
          Acquisition → activation → monetization → retention · real (external) users only
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Stage step={1} label="Acquisition" value={g.external_total.toLocaleString()} sub="signups by channel">
          <SourceBars bySource={g.acquisition.by_source} />
        </Stage>
        <Stage
          step={2}
          label="Activation"
          value={pct(g.activation.rate)}
          sub={`${g.activation.activated} activated · first paid credit spend`}
        />
        <Stage
          step={3}
          label="Monetization"
          value={pct(g.monetization.conversion)}
          sub={`${g.monetization.paying} paying · free → paid`}
        />
        <Stage
          step={4}
          label="Retention"
          value={pct(g.retention.repeat_rate)}
          sub={`${g.retention.repeat_buyers} repeat buyers · ≥2 purchases`}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Unit economics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="CAC"
            value={g.acquisition.cac == null ? "—" : eur(g.acquisition.cac)}
            sub="ads ÷ new payers (once ads run)"
          />
          <Metric
            label="LTV (avg)"
            value={g.monetization.ltv_avg == null ? "—" : eur(g.monetization.ltv_avg)}
            sub="avg purchases / payer"
          />
          <Metric label="LTV (total)" value={eur(g.monetization.ltv_total)} sub="sum of purchases" />
          <Metric
            label="LTV : CAC"
            value={g.acquisition.cac && g.monetization.ltv_avg ? `${(g.monetization.ltv_avg / g.acquisition.cac).toFixed(1)}×` : "—"}
            sub="target ≥ 3×"
          />
        </div>
      </div>

      {g.monetization.paying === 0 && (
        <div className="rounded-xl border border-dashed bg-surface-sunken px-4 py-3 text-sm text-fg-muted">
          Pre-launch: no external conversions yet. The funnel structure is live and will populate as real
          users sign up, activate, and purchase. CAC unlocks once ads spend is recorded in{" "}
          <span className="font-mono text-xs">opex_expenses</span>.
        </div>
      )}
    </div>
  )
}
