import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { FinanceView } from "./FinanceView"
import { makePeriod, type PeriodKind } from "./periods"
import type { FinanceSummary, SnapshotRow, ExpenseRow, CostConfigRow } from "./financeTypes"

export const dynamic = "force-dynamic"

const KINDS = new Set(["week", "month", "quarter", "year", "alltime", "custom"])

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const kind: PeriodKind = KINDS.has(sp.period ?? "") ? (sp.period as PeriodKind) : "month"
  const now = new Date()
  const anchor = sp.anchor ? new Date(sp.anchor + "T00:00:00Z") : now
  const customTo = sp.to ? new Date(sp.to + "T00:00:00Z") : undefined

  const admin = createAdminClient()
  // Read finance_settings FIRST — the business start (F13) defines the "All time" lower bound, which feeds the
  // summary RPC's p_from, so the period must be built before the summary/comparison calls.
  const { data: setData } = await admin.from("finance_settings").select("key,value")
  const settings = Object.fromEntries((setData ?? []).map((s) => [s.key, s.value]))
  const businessStartISO = typeof settings.business_start_date === "string" ? settings.business_start_date : "2026-01-01"
  const businessStart = new Date(businessStartISO + "T00:00:00Z")
  const period = makePeriod(kind, anchor, now, customTo, businessStart)

  const [curRes, cmpRes, snapRes, expRes, cfgRes] = await Promise.all([
    admin.rpc("admin_finance_summary", { p_from: period.from.toISOString(), p_to: period.to.toISOString() }),
    admin.rpc("admin_finance_summary", { p_from: period.compareFrom.toISOString(), p_to: period.compareTo.toISOString() }),
    admin.from("finance_daily_snapshot").select(
      "snapshot_date,scope,cash_in,vat,revenue_delivered,net_profit_measured,deferred_balance,cor_ai_transcription,cor_caption,cor_ai_summary,cor_rag,cor_storage",
    ).order("snapshot_date", { ascending: true }),
    admin.from("opex_expenses").select(
      "id,category,description,note,amount,spread,recurrence,effective_from,effective_to",
    ).order("effective_from", { ascending: false }),
    admin.from("cost_config").select(
      "id,decodo_eur_per_gb,assemblyai_eur_per_min,deepseek_eur_per_1k_input_tokens,deepseek_eur_per_1k_output_tokens,deepseek_eur_per_1k_cache_hit_tokens,r2_usd_per_gb_month,usd_eur_rate",
    ).order("effective_from", { ascending: false }).limit(1).single(),
  ])

  const summary = curRes.data as FinanceSummary | null
  if (!summary) {
    return (
      <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">
        Finance data unavailable{curRes.error ? `: ${curRes.error.message}` : ""}.
      </div>
    )
  }

  const expenses = (expRes.data ?? []).map((r): ExpenseRow => ({
    id: r.id, category: r.category, description: r.description ?? r.note ?? null,
    amount: Number(r.amount ?? 0), spread: r.spread ?? "single", recurrence: r.recurrence ?? "none",
    effective_from: r.effective_from, effective_to: r.effective_to,
  }))

  return (
    <FinanceView
      summary={summary}
      comparison={(cmpRes.data as FinanceSummary | null) ?? null}
      snapshots={(snapRes.data as SnapshotRow[] | null) ?? []}
      expenses={expenses}
      costConfig={(cfgRes.data as CostConfigRow | null) ?? null}
      deferredWindowDays={Number(settings.deferred_window_days ?? 90)}
      period={{
        kind: period.kind, from: period.from.toISOString(), to: period.to.toISOString(),
        label: period.label, toDate: period.toDate, anchorISO: anchor.toISOString().slice(0, 10),
        businessStartISO,
      }}
      generatedAt={now.toISOString()}
    />
  )
}
