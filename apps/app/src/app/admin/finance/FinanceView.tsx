"use client"

import { useState, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@indxr/shared/components/ui/switch"
import { eur, pct, TYPE_META } from "../adminTypes"
import type { FinanceSummary, FinanceScope, SnapshotRow, ExpenseRow, CostConfigRow, EnteredOpexLine } from "./financeTypes"
import { shiftAnchor, type PeriodKind } from "./periods"
import { accrualForRange } from "./accrual"
import { FinanceSettings } from "./SettingsDialog"

interface PeriodProp {
  kind: PeriodKind
  from: string
  to: string
  label: string
  toDate: boolean
  anchorISO: string
}

interface Props {
  summary: FinanceSummary
  comparison: FinanceSummary | null
  snapshots: SnapshotRow[]
  expenses: ExpenseRow[]
  costConfig: CostConfigRow | null
  deferredWindowDays: number
  period: PeriodProp
  generatedAt: string
}

const KINDS: { key: PeriodKind; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
]

function delta(cur: number, prev: number): { txt: string; up: boolean } | null {
  if (prev === 0) return null
  const d = (cur - prev) / Math.abs(prev)
  return { txt: `${d >= 0 ? "+" : ""}${(d * 100).toFixed(0)}%`, up: d >= 0 }
}

// Proportional segmented bar.
function SplitBar({ segments }: { segments: { value: number; cls: string; title: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <div className="h-2.5 w-full rounded-full bg-surface-sunken" />
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      {segments.map((s, i) =>
        s.value > 0 ? <div key={i} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} title={s.title} /> : null,
      )}
    </div>
  )
}

// Green is reserved for POSITIVE profit only. Revenue is neutral; costs are red; profit is sign-coloured.
function profitTone(n: number): string {
  return n > 0 ? "text-success" : n < 0 ? "text-error" : "text-fg-strong"
}

function StatementLine({
  label, value, accent, num, marginLabel, children,
}: { label: string; value: string; accent?: "in" | "cost" | "profit"; num?: number; marginLabel?: string; children?: ReactNode }) {
  const color =
    accent === "cost" ? "text-error"
    : accent === "profit" ? profitTone(num ?? 0)
    : "text-fg-strong"
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</span>
        <div className="flex items-baseline gap-2">
          {marginLabel && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">{marginLabel}</span>
          )}
          <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
        </div>
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

function Op({ text }: { text: string }) {
  return (
    <div className="relative flex justify-center py-2 before:absolute before:left-1/2 before:-top-3 before:h-3 before:w-px before:bg-border">
      <span className="rounded-full border bg-bg px-2.5 py-0.5 text-[11px] text-fg-muted">{text}</span>
    </div>
  )
}

// A source pill: "measured" (auto) vs "entered" (Khidr).
function Src({ kind }: { kind: "measured" | "entered" }) {
  return kind === "entered"
    ? <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-[10px] font-medium text-accent-fg">entered</span>
    : <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">measured</span>
}

const COR_METHODS = ["ai_transcription", "caption", "ai_summary", "rag"] as const

// COR breakdown drawn as a 4-column table (Method · Cost · Credits · €/credit) — per the mockup.
// Cost = against-revenue portion per method (Σ == the COR line above); €/credit = true gross unit cost.
function CorTable({ s }: { s: FinanceScope }) {
  const cor = s.cor
  const aiCache = s.cache_savings.ai_transcription
  const capCache = s.cache_savings.caption
  const cacheSub: Partial<Record<(typeof COR_METHODS)[number], string | null>> = {
    ai_transcription: aiCache.total_jobs > 0 ? `${pct(aiCache.pct)} from cache · saved ${eur(aiCache.saved_eur, true)}` : null,
    caption: capCache.total_count > 0 ? `${pct(capCache.pct)} from cache · saved ${eur(capCache.saved_eur, true)}` : null,
  }
  return (
    <div className="mt-1 rounded-lg border bg-surface-sunken/40">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-5 border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        <span>Method</span><span className="text-right">Cost</span><span className="text-right">Credits</span><span className="text-right">€ / credit</span>
      </div>
      {COR_METHODS.map((k) => {
        const credits = s.consumed_by_type[k]
        const unit = credits > 0 ? cor[k] / credits : 0
        return (
          <div key={k} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className={`w-fit rounded-full px-2 py-0.5 font-medium ${TYPE_META[k].bg} ${TYPE_META[k].text}`}>{TYPE_META[k].label}</span>
              {cacheSub[k] && <span className="text-[11px] text-fg-subtle">{cacheSub[k]}</span>}
            </div>
            <span className="text-right font-semibold tabular-nums text-fg">{eur(cor.against_revenue_by_method[k], true)}</span>
            <span className="text-right tabular-nums text-fg-muted">{credits.toLocaleString()}</span>
            <span className="text-right tabular-nums text-fg-muted">{credits > 0 ? eur(unit, true) : "—"}</span>
          </div>
        )
      })}
      {/* storage — a quiet row, no per-credit unit */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
        <span className="w-fit rounded-full bg-warning-subtle px-2 py-0.5 font-medium text-warning-fg">Storage (R2)</span>
        <span className="text-right font-semibold tabular-nums text-fg">{eur(cor.against_revenue_by_method.storage, true)}</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
      </div>
      <p className="border-t px-3 py-2 text-[11px] text-fg-subtle">
        Playlists spend credits through these same methods, so they have no separate line. Credits by source lives in Operations.
      </p>
    </div>
  )
}

// OPEX drawn as a table (Category · Source · Cost). Goodwill (granted-credit delivery) is a visible row here,
// not an unexplained gap between the COR line and its breakdown.
function OpexTable({ s, enteredLines, isExternal }: { s: FinanceScope; enteredLines: EnteredOpexLine[]; isExternal: boolean }) {
  const m = s.measured_opex
  // fee_details per component uit Stripe zelf (geen hardcoded rates) — bv. "processing €0,64 · currency €0,03".
  const feeParts = Object.entries(m.stripe_fee_by_type ?? {})
  const FEE_LABEL: Record<string, string> = { stripe_fee: "processing", tax: "tax on fee", currency_conversion: "currency" }
  const feeHint = feeParts.length
    ? feeParts.map(([t, v]) => `${FEE_LABEL[t] ?? t} ${eur(v, true)}`).join(" · ")
    : "Stripe fee · at sale"
  const measuredRows: { name: string; hint?: string; cost: number }[] = []
  if (m.stripe_fee > 0) measuredRows.push({ name: "Payment processing", hint: feeHint, cost: m.stripe_fee })
  measuredRows.push({ name: "Goodwill — granted credits used", hint: "delivery of granted credits", cost: m.goodwill })
  measuredRows.push({ name: "Free-caption funnel — logged-in", hint: "measured per day", cost: m.funnel_loggedin })
  measuredRows.push({ name: "Free-caption funnel — anonymous", hint: "measured per day", cost: m.funnel_anon })

  return (
    <div className="mt-1 rounded-lg border bg-surface-sunken/40">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-5 border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        <span>Category</span><span className="text-center">Source</span><span className="text-right">Cost</span>
      </div>
      {isExternal && enteredLines.map((l) => {
        const hint = l.recurrence === "monthly"
          ? `${eur(l.amount)} / month · ${l.days_applied} of ${l.days_total} days`
          : l.description || `${l.days_applied} day${l.days_applied === 1 ? "" : "s"}`
        return (
          <div key={l.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium capitalize text-fg">{l.category}</span>
              <span className="text-[11px] text-fg-subtle">{hint}</span>
            </div>
            <span className="text-center"><Src kind="entered" /></span>
            <span className="text-right font-semibold tabular-nums text-fg">{eur(l.period_amount)}</span>
          </div>
        )
      })}
      {measuredRows.map((r) => (
        <div key={r.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-fg">{r.name}</span>
            {r.hint && <span className="text-[11px] text-fg-subtle">{r.hint}</span>}
          </div>
          <span className="text-center"><Src kind="measured" /></span>
          <span className="text-right font-semibold tabular-nums text-fg">{eur(r.cost, true)}</span>
        </div>
      ))}
      <p className="border-t px-3 py-2 text-[11px] text-fg-subtle">
        Entered costs carry their own dates, sliced to the period. Measured costs come from actual daily usage.
      </p>
    </div>
  )
}

function IncomeStatement({ s, enteredLines, isExternal }: { s: FinanceScope; enteredLines: EnteredOpexLine[]; isExternal: boolean }) {
  const [corOpen, setCorOpen] = useState(true)
  const [opexOpen, setOpexOpen] = useState(true)
  const cor = s.cor
  const opexTotal = s.measured_opex.total + (isExternal ? s.entered_opex_total : 0)

  return (
    <div>
      <StatementLine label="Revenue · delivered (ex-VAT)" value={eur(s.revenue_delivered)} accent="in">
        <p className="text-xs text-fg-muted">
          Recognised on consumption · deferred obligation {eur(s.deferred_balance)} held separately
        </p>
      </StatementLine>

      <Op text={`− COR ${eur(cor.against_revenue, true)}`} />

      <StatementLine label="Cost of revenue" value={eur(cor.against_revenue, true)} accent="cost">
        <button onClick={() => setCorOpen((v) => !v)} className="text-xs text-accent hover:underline">
          {corOpen ? "Hide breakdown" : "Show breakdown per method"}
        </button>
        {corOpen && <CorTable s={s} />}
      </StatementLine>

      <div className="relative py-2"><div className="absolute left-1/2 -top-1 h-1 w-px bg-border" /></div>

      <StatementLine label="Gross profit" value={eur(s.gross_profit)} accent="profit" num={s.gross_profit} marginLabel={`margin ${pct(s.gross_margin)}`}>
        <p className="text-xs text-fg-muted">Delivered revenue − cost of revenue (incl. storage)</p>
      </StatementLine>

      <Op text={`− OPEX ${eur(opexTotal)}`} />

      <StatementLine label="Operating expenses" value={eur(opexTotal)} accent="cost">
        <button onClick={() => setOpexOpen((v) => !v)} className="text-xs text-accent hover:underline">
          {opexOpen ? "Hide breakdown" : "Show breakdown"}
        </button>
        {opexOpen && <OpexTable s={s} enteredLines={enteredLines} isExternal={isExternal} />}
      </StatementLine>

      <div className="relative py-2"><div className="absolute left-1/2 -top-1 h-1 w-px bg-border" /></div>

      <StatementLine label="Net profit" value={eur(s.net_profit)} accent="profit" num={s.net_profit} marginLabel={`margin ${pct(s.net_margin)}`}>
        <p className="text-xs text-fg-muted">Gross profit − operating expenses</p>
      </StatementLine>
    </div>
  )
}

function BankBridge({ s }: { s: FinanceScope }) {
  const b = s.bank
  return (
    <div className="rounded-xl border bg-surface p-5">
      <h3 className="text-sm font-semibold">Where the cash sits</h3>
      <p className="mb-3 text-xs text-fg-muted">What actually lands in the bank, and what's owed on it.</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-fg-muted">Charged to customers <span className="text-fg-subtle">(settlement €)</span></span><span className="font-semibold tabular-nums">{eur(b.charged)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">− Stripe fee</span><span className="font-semibold tabular-nums text-error">{eur(b.stripe_fee)}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-medium">= Settled to your bank</span><span className="font-bold tabular-nums">{eur(b.net_settlement > 0 ? b.net_settlement : b.settled_computed)}</span></div>
        <div className="mt-3 space-y-1.5 rounded-lg bg-surface-sunken p-3 text-xs">
          <div className="flex justify-between font-medium"><span>VAT owed <span className="font-normal text-fg-subtle">(measured)</span></span><span className="tabular-nums">{eur(b.vat_owed)}</span></div>
          {(["nl", "oss", "outside"] as const).map((k) => {
            const bk = s.vat_buckets[k]
            if (!bk || bk.count === 0) return null
            const label = k === "nl" ? "NL — own VAT return" : k === "oss" ? "Other EU — OSS" : "Outside EU — €0 (customer's country)"
            return (
              <div key={k} className="flex justify-between pl-3 text-fg-muted">
                <span>{label} <span className="text-fg-subtle">· {bk.count}</span></span>
                <span className="tabular-nums">{eur(bk.vat)}</span>
              </div>
            )
          })}
          <div className="flex justify-between border-t pt-1.5"><span className="text-fg-muted">Revenue ex-VAT (delivered + deferred)</span><span className="tabular-nums">{eur(b.revenue_ex_vat)}</span></div>
        </div>
        {s.payment_methods.length > 0 && (
          <p className="text-[11px] text-fg-subtle">via {s.payment_methods.join(", ")}</p>
        )}
        {s.vat_buckets.unknown && s.vat_buckets.unknown.count > 0 && (
          <p className="text-[11px] text-warning">
            ⚠ {s.vat_buckets.unknown.count} sale{s.vat_buckets.unknown.count === 1 ? "" : "s"} ({eur(s.vat_buckets.unknown.gross)}) with VAT not measured —
            excluded from the VAT above; revenue for those may be up to ~21% overstated until backfilled from Stripe.
          </p>
        )}
      </div>
    </div>
  )
}

function DeferredCard({ s }: { s: FinanceScope }) {
  const d = s.deferred
  return (
    <div className="rounded-xl border bg-surface p-5">
      <h3 className="text-sm font-semibold">Deferred</h3>
      <p className="mb-3 text-xs text-fg-muted">Revenue collected but not yet delivered.</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-fg-muted">Balance (ex-VAT)</span><span className="font-semibold tabular-nums">{eur(d.balance)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">Credits outstanding</span><span className="tabular-nums">{d.credits.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">Est. cost to deliver <span className="rounded bg-warning-subtle px-1 text-[10px] text-warning">est</span></span><span className="tabular-nums">{eur(d.est_future_cost)}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-medium">Est. future gross</span><span className="font-bold tabular-nums">{eur(d.est_future_gross)}</span></div>
        <p className="text-[11px] text-fg-subtle">Based on the last {d.window_days} days' usage mix.</p>
      </div>
    </div>
  )
}

// Trend from frozen snapshots + live entered-OPEX overlay.
function Trend({ snapshots, scope, expenses }: { snapshots: SnapshotRow[]; scope: "external" | "internal"; expenses: ExpenseRow[] }) {
  const [metric, setMetric] = useState<"revenue" | "net" | "split">("revenue")
  const rows = snapshots.filter((r) => r.scope === scope)
  if (rows.length < 2) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h3 className="text-sm font-semibold">Trend</h3>
        <p className="mt-2 text-xs text-fg-muted">
          Measured figures are frozen nightly · entered costs update live. The trend fills in as nightly
          snapshots accumulate ({rows.length} day{rows.length === 1 ? "" : "s"} so far).
        </p>
      </div>
    )
  }
  // per-day: measured net − live entered accrual for that day
  const bars = rows.map((r) => {
    const from = r.snapshot_date
    const to = new Date(Date.parse(from + "T00:00:00Z") + 86400000).toISOString().slice(0, 10)
    const entered = scope === "external" ? accrualForRange(expenses, from, to) : 0
    const net = r.net_profit_measured - entered
    const val = metric === "revenue" ? r.revenue_delivered : metric === "net" ? net : r.revenue_delivered
    return { date: from, val, revenue: r.revenue_delivered, deferred: r.deferred_balance, net }
  })
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.val)))
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Trend</h3>
        <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5 text-xs">
          {(["revenue", "net", "split"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)}
              className={`rounded-md px-2 py-1 ${metric === m ? "bg-surface font-medium text-fg" : "text-fg-muted"}`}>
              {m === "revenue" ? "Revenue" : m === "net" ? "Net profit" : "Delivered/deferred"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex h-32 items-end gap-1">
        {bars.map((b) => (
          <div key={b.date} className="flex flex-1 flex-col items-center gap-1" title={`${b.date}: ${eur(b.val)}`}>
            <div className="flex w-full items-end justify-center" style={{ height: "100%" }}>
              <div className={`w-full rounded-t ${b.val >= 0 ? "bg-accent" : "bg-error"}`}
                style={{ height: `${(Math.abs(b.val) / max) * 100}%`, minHeight: b.val !== 0 ? "2px" : "0" }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">
        Measured figures frozen nightly · entered costs update live (historical net can shift after an expense edit — intended).
      </p>
    </div>
  )
}

function PeriodPicker({ period }: { period: PeriodProp }) {
  const router = useRouter()
  const go = (params: Record<string, string>) => {
    const q = new URLSearchParams(params)
    router.push(`/admin/finance?${q.toString()}`)
  }
  const setKind = (kind: PeriodKind) => go({ period: kind })
  const nav = (dir: -1 | 1) => {
    if (period.kind === "custom") return
    const anchor = new Date(period.anchorISO + "T00:00:00Z")
    const next = shiftAnchor(period.kind, anchor, dir)
    if (dir === 1 && next > new Date()) return // cap at running period
    go({ period: period.kind, anchor: next.toISOString().slice(0, 10) })
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5 text-sm">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)}
            className={`rounded-md px-3 py-1 ${period.kind === k.key ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`}>
            {k.label}
          </button>
        ))}
      </div>
      {period.kind !== "custom" && (
        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} className="rounded-md border px-2 py-1 text-sm hover:bg-surface-elevated" aria-label="Previous period">←</button>
          <span className="min-w-[8rem] text-center text-sm font-medium">{period.label}{period.toDate ? " · to date" : ""}</span>
          <button onClick={() => nav(1)} disabled={period.toDate}
            className="rounded-md border px-2 py-1 text-sm hover:bg-surface-elevated disabled:opacity-40" aria-label="Next period">→</button>
        </div>
      )}
    </div>
  )
}

export function FinanceView(props: Props) {
  const { summary, comparison, snapshots, expenses, costConfig, deferredWindowDays, period, generatedAt } = props
  const router = useRouter()
  const [showTest, setShowTest] = useState(false)
  // In-place scope swap: the whole view shows ONE scope at a time, figures swap in place.
  const isExternal = !showTest
  const scopeKey: "external" | "internal" = isExternal ? "external" : "internal"
  const scope: FinanceScope = summary[scopeKey]
  const cmp = comparison?.[scopeKey] ?? null
  const netDelta = cmp ? delta(scope.net_profit, cmp.net_profit) : null
  const revDelta = cmp ? delta(scope.revenue_delivered, cmp.revenue_delivered) : null
  const updated = useMemo(() => new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [generatedAt])

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Finance</h1>
            {!isExternal && (
              <span className="rounded-full border border-warning-border bg-warning-subtle px-2 py-0.5 text-[11px] font-medium text-warning-fg">
                internal / test scope
              </span>
            )}
          </div>
          <p className="text-sm text-fg-muted">
            {isExternal ? "Real economy · internal/test accounts excluded" : "Test traffic only · not the real economy · entered costs excluded"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Live · updated {updated}
          </span>
          <button onClick={() => router.refresh()} className="rounded-md border px-2.5 py-1 text-sm hover:bg-surface-elevated">Refresh</button>
          <FinanceSettings expenses={expenses} costConfig={costConfig} deferredWindowDays={deferredWindowDays} enteredLines={summary.entered_opex.lines} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker period={period} />
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <Switch checked={showTest} onCheckedChange={setShowTest} />
          Show internal / test
        </label>
      </div>

      {/* hero */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-surface p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Net profit</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tabular-nums ${profitTone(scope.net_profit)}`}>{eur(scope.net_profit)}</span>
            {netDelta && <span className={`text-sm font-medium ${netDelta.up ? "text-accent" : "text-error"}`}>{netDelta.txt}</span>}
          </div>
          <p className="mt-1 text-xs text-fg-muted">vs same elapsed days last period</p>
        </div>
        <div className="rounded-xl border bg-surface p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Revenue</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-fg-strong">{eur(scope.revenue_delivered + scope.deferred_balance)}</span>
            {revDelta && <span className={`text-sm font-medium ${revDelta.up ? "text-accent" : "text-error"}`}>{revDelta.txt}</span>}
          </div>
          <div className="mt-2">
            <SplitBar segments={[
              { value: scope.revenue_delivered, cls: "bg-accent", title: "Delivered" },
              { value: scope.deferred_balance, cls: "bg-accent/40", title: "Deferred" },
            ]} />
            <div className="mt-1 flex gap-4 text-[11px] text-fg-muted">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />Delivered {eur(scope.revenue_delivered)}</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent/40 align-middle" />Deferred {eur(scope.deferred_balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* income statement + cards — one scope in place */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <IncomeStatement s={scope} enteredLines={summary.entered_opex.lines} isExternal={isExternal} />
        <div className="space-y-4">
          <BankBridge s={scope} />
          <DeferredCard s={scope} />
        </div>
      </div>

      <Trend snapshots={snapshots} scope={scopeKey} expenses={expenses} />
    </div>
  )
}
