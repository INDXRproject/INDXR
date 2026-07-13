import Link from "next/link"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { eur, pct, type GeldSummary, type GrowthSummary, type OperationsSummary } from "./adminTypes"

// A block summary card linking to its full tab: one headline + two supporting stats.
function BlockCard({
  href, title, headline, headlineSub, stats,
}: {
  href: string
  title: string
  headline: string
  headlineSub: string
  stats: { label: string; value: string }[]
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-surface p-5 transition-colors hover:border-strong hover:bg-surface-elevated"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">{title}</span>
        <span className="text-fg-subtle transition-transform group-hover:translate-x-0.5">→</span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-fg-strong">{headline}</p>
      <p className="text-xs text-fg-muted">{headlineSub}</p>
      <div className="mt-4 flex gap-6 border-t pt-3">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-sm font-semibold tabular-nums">{s.value}</p>
            <p className="text-[11px] text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </Link>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-surface px-4 py-3">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-fg-muted">{label}</p>
    </div>
  )
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const [
    { data: geldRaw },
    { data: growthRaw },
    { data: opsRaw },
    { count: totalTranscripts },
    { data: authUsers },
  ] = await Promise.all([
    admin.rpc("admin_geld_summary"),
    admin.rpc("admin_growth_summary"),
    admin.rpc("admin_operations_summary"),
    admin.from("transcripts").select("*", { count: "exact", head: true }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const geld = geldRaw as GeldSummary | null
  const growth = growthRaw as GrowthSummary | null
  const ops = opsRaw as OperationsSummary | null

  const totalUsers = authUsers?.users?.length ?? 0
  const balance = geld ? geld.external.balance_cr + geld.internal.balance_cr : 0
  const preRevenue = geld ? geld.external.cash_in_gross === 0 && geld.external.consumed_cr === 0 : true

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-fg-muted">Control center summary</p>
      </div>

      {preRevenue && (
        <div className="rounded-xl border border-warning-border bg-warning-subtle/40 px-4 py-3 text-sm">
          <span className="font-semibold">Pre-revenue.</span> The real (external) economy is €0 — all
          measured activity so far is internal testing. Figures below reflect real users only.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {geld && (
          <BlockCard
            href="/admin/finance"
            title="Finance"
            headline={eur(geld.external.recognized_revenue)}
            headlineSub="recognized revenue (real)"
            stats={[
              { label: "cash in", value: eur(geld.external.cash_in_gross) },
              { label: "deferred", value: eur(geld.external.deferred_revenue) },
            ]}
          />
        )}
        {growth && (
          <BlockCard
            href="/admin/growth"
            title="Growth"
            headline={growth.external_total.toLocaleString()}
            headlineSub="external signups"
            stats={[
              { label: "paying", value: growth.monetization.paying.toLocaleString() },
              { label: "conversion", value: pct(growth.monetization.conversion) },
            ]}
          />
        )}
        {ops && (
          <BlockCard
            href="/admin/operations"
            title="Operations"
            headline={pct(ops.success_rate)}
            headlineSub="job success rate"
            stats={[
              { label: "jobs", value: ops.jobs.total.toLocaleString() },
              { label: "in flight", value: ops.jobs.in_flight.toLocaleString() },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="Total users" value={totalUsers.toLocaleString()} />
        <Total label="Total transcripts" value={(totalTranscripts ?? 0).toLocaleString()} />
        <Total label="Credits in circulation" value={balance.toLocaleString()} />
        <Total label="Internal accounts" value={(geld?.counts.internal_profiles ?? 0).toLocaleString()} />
      </div>
    </div>
  )
}
