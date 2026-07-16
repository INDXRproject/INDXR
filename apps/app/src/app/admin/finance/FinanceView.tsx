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

// Green is reserved for POSITIVE profit only. Revenue is neutral; costs are red; profit is sign-coloured.
function profitTone(n: number): string {
  return n > 0 ? "text-success" : n < 0 ? "text-error" : "text-fg-strong"
}

// COR-table display: round ONLY at render, never in the source. Cost at 2 decimals; a value that is >0 but
// rounds to 0.00 shows "<€0.01" (never a misleading "€0.00"). A genuine zero stays "€0.00".
function corCost(n: number): string {
  if (n === 0) return eur(0)
  if (n < 0.005) return "<€0.01"
  return eur(n)
}
// €/credit: ALWAYS the real bron-price at 8 decimals (fixed width via tabular-nums), never a flag. This is the
// source price — it may legitimately be tiny, and the difference between e.g. €0.00001246 (caption) and
// €0.00006667 (ai_summary) must stay visible. Only "no credits → —" (there is no price to show). The "<€0.01"
// flag belongs ONLY in the COST column.
function corUnit(credits: number, cost: number): string {
  if (credits === 0) return "—"
  return `€${(cost / credits).toFixed(8)}`
}

// Same EU member-state list as admin_finance_summary (v_eu). EL = Greece alt-code. GB absent (Brexit).
const EU_MEMBERS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "EL", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
])
const REGION_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null
function countryName(code: string): string {
  if (code === "??") return "Unknown country"
  try {
    return REGION_NAMES?.of(code) ?? code
  } catch {
    return code
  }
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

// COR breakdown drawn as a 4-column table (Method · Cost · Credits · €/credit).
// Option (ii): Cost = FULL cost per method (cor[k]), Credits = all consumed credits of that method,
// €/credit = Cost/Credits → the row MULTIPLIES (Credits × €/credit = Cost). The against-revenue/goodwill
// split is a SEPARATE line beneath, not baked into the columns. The Stripe fee (COR, F22) is its own line:
// recognised now (in cost of revenue) · deferred (held in the Deferred card).
function CorTable({ s }: { s: FinanceScope }) {
  const cor = s.cor
  const aiCache = s.cache_savings.ai_transcription
  const capCache = s.cache_savings.caption
  const cacheSub: Partial<Record<(typeof COR_METHODS)[number], string | null>> = {
    ai_transcription: aiCache.total_jobs > 0 ? `${pct(aiCache.pct)} from cache · saved ${eur(aiCache.saved_eur, true)}` : null,
    caption: capCache.total_count > 0 ? `${pct(capCache.pct)} from cache · saved ${eur(capCache.saved_eur, true)}` : null,
    // RAG cost is an explicit ASSUMPTION, not a measured €0: RAG reshapes an existing transcript with no
    // external API call, so marginal cost ≈ €0. If a measurable compute/egress cost appears, measure it.
    rag: "assumed ~€0 · reshape of existing transcript, no external API call",
  }
  const abm = cor.against_revenue_by_method
  // Against-revenue of the usage methods + storage (NOT the fee — the fee has its own recognised/deferred line).
  const usageAgainst = abm.ai_transcription + abm.caption + abm.ai_summary + abm.rag + abm.storage
  // Goodwill = full measured COR that was NOT matched to paid revenue (granted-credit delivery). Booked in OPEX.
  const goodwill = cor.measured_total - usageAgainst
  const fee = cor.payment_fee
  return (
    <div className="mt-1 rounded-lg border bg-surface-sunken/40">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-5 border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        <span>Method</span><span className="text-right">Cost</span><span className="text-right">Credits</span><span className="text-right">€ / credit</span>
      </div>
      {COR_METHODS.map((k) => {
        const credits = s.consumed_by_type[k]
        return (
          <div key={k} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className={`w-fit rounded-full px-2 py-0.5 font-medium ${TYPE_META[k].bg} ${TYPE_META[k].text}`}>{TYPE_META[k].label}</span>
              {cacheSub[k] && <span className="text-[11px] text-fg-subtle">{cacheSub[k]}</span>}
            </div>
            <span className="text-right font-semibold tabular-nums text-fg">{corCost(cor[k])}</span>
            <span className="text-right tabular-nums text-fg-muted">{credits.toLocaleString()}</span>
            <span className="text-right tabular-nums text-fg-muted">{corUnit(credits, cor[k])}</span>
          </div>
        )
      })}
      {/* storage — a quiet row, no per-credit unit */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 px-3 py-2 text-xs">
        <span className="w-fit rounded-full bg-warning-subtle px-2 py-0.5 font-medium text-warning-fg">Storage (R2)</span>
        <span className="text-right font-semibold tabular-nums text-fg">{corCost(cor.storage)}</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
      </div>
      {/* Total FULL measured COR — this is what the rows sum to (Σ Cost). */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 border-t px-3 py-2 text-xs">
        <span className="font-semibold text-fg">Total measured COR</span>
        <span className="text-right font-bold tabular-nums text-fg">{corCost(cor.measured_total)}</span>
        <span className="text-right tabular-nums text-fg-subtle">—</span>
        <span className="text-right tabular-nums text-fg-subtle">—</span>
      </div>
      {/* The split: full COR bridges to against-revenue (in Cost of revenue) + goodwill (in Operating expenses). */}
      <div className="border-t px-3 py-2 text-[11px] text-fg-muted">
        of which <span className="font-medium text-fg">against revenue {eur(usageAgainst, true)}</span> (in cost of revenue) ·{" "}
        <span className="font-medium text-fg">goodwill {eur(goodwill, true)}</span> (granted credits → operating expenses)
      </div>
      {/* Stripe fee — COR, revenue-matched (F22). Recognised part is inside Cost of revenue; deferred part is held. */}
      {fee.purchased > 0 && (
        <div className="border-t px-3 py-2 text-[11px] text-fg-muted">
          <span className="font-medium text-fg">Payment processing (Stripe) {eur(fee.recognized, true)}</span> recognised (in cost of revenue) ·{" "}
          {eur(fee.deferred, true)} deferred · {eur(fee.purchased, true)} paid at sale
        </div>
      )}
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
  const measuredRows: { name: string; hint?: string; cost: number }[] = []
  // Stripe fee is NOT here anymore — it moved to COR (F22), shown in the COR breakdown as recognised/deferred.
  // Radar screent élke poging (successful+declined+blocked) à €rate; gratis t/m free_until. Driver zichtbaar.
  const rd = m.radar
  if (rd && rd.screens > 0) {
    const trial = rd.free_until && rd.billable < rd.screens ? ` · free until ${rd.free_until}` : ""
    const radarHint = `${rd.screens} screened (${rd.successful} ok · ${rd.declined} declined · ${rd.blocked} blocked) × ${eur(rd.rate, true)}${trial}`
    measuredRows.push({ name: "Fraud screening (Radar)", hint: radarHint, cost: m.radar_fee })
  }
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
      {/* VAT first: that money was never ours. Then fee. Two independent deductions from the same gross —
          not a chain. Every intermediate number (ex-VAT, Yours to keep) genuinely exists on-screen. */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-fg-muted">Charged to customers <span className="text-fg-subtle">(settlement €)</span></span><span className="font-semibold tabular-nums">{eur(b.charged)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">− VAT <span className="text-fg-subtle">(owed to tax office)</span></span><span className="font-semibold tabular-nums text-error">{eur(b.vat_owed)}</span></div>
        {/* per-land VAT breakdown stays directly under the VAT line */}
        {(["nl", "oss", "outside"] as const).map((k) => {
          const bk = s.vat_buckets[k]
          if (!bk || bk.count === 0) return null
          const label = k === "nl" ? "NL — own VAT return" : k === "oss" ? "Other EU — OSS" : "Outside EU — €0 (customer's country)"
          return (
            <div key={k} className="flex justify-between pl-3 text-xs text-fg-muted">
              <span>{label} <span className="text-fg-subtle">· {bk.count}</span></span>
              <span className="tabular-nums">{eur(bk.vat)}</span>
            </div>
          )
        })}
        <div className="flex justify-between border-t pt-2"><span className="font-medium">= Revenue ex-VAT</span><span className="font-semibold tabular-nums">{eur(b.revenue_ex_vat)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">− Stripe fee</span><span className="font-semibold tabular-nums text-error">{eur(b.stripe_fee)}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-medium">= Yours to keep</span><span className="font-bold tabular-nums">{eur(b.revenue_ex_vat - b.stripe_fee)}</span></div>
        {/* Settled = the bank statement (charged − fee). The gap vs "Yours to keep" is the VAT reserved on it. */}
        <div className="mt-3 flex justify-between rounded-lg bg-surface-sunken p-3 text-xs">
          <span className="text-fg-muted">Settled to your bank <span className="text-fg-subtle">(bank statement)</span></span>
          <span className="font-medium tabular-nums">{eur(b.net_settlement > 0 ? b.net_settlement : b.settled_computed)}</span>
        </div>
        <p className="text-[11px] text-fg-subtle">of which {eur(b.vat_owed)} is not yet yours (VAT held for the tax office)</p>
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

// Revenue split by region — the counterpart to the VAT buckets. Under VAT, "outside EU" is always €0
// and empty; under Revenue it's the biggest number we have (a US €15 sale nets €15, an NL €12.40).
// Countries are listed BY NAME under each bucket: that is our only detection that the Radar country-block
// still works — if 'GB' (or any blocked country) shows up here, the guard stopped blocking.
function RevenueByRegion({ s }: { s: FinanceScope }) {
  type Row = { code: string; gross: number; vat: number; count: number; unknownVat: boolean }
  type Bucket = { gross: number; vat: number; count: number; rows: Row[] }
  const empty = (): Bucket => ({ gross: 0, vat: 0, count: 0, rows: [] })
  const buckets: Record<"nl" | "eu" | "intl", Bucket> = { nl: empty(), eu: empty(), intl: empty() }

  for (const [code, v] of Object.entries(s.vat_by_country)) {
    const key = code === "NL" ? "nl" : EU_MEMBERS.has(code) ? "eu" : "intl"
    const b = buckets[key]
    b.gross += v.gross
    b.vat += v.vat
    b.count += v.count
    b.rows.push({ code, gross: v.gross, vat: v.vat, count: v.count, unknownVat: v.unknown_vat })
  }
  for (const b of Object.values(buckets)) b.rows.sort((a, z) => z.gross - a.gross)

  const meta: Record<"nl" | "eu" | "intl", string> = {
    nl: "Netherlands",
    eu: "Other EU",
    intl: "International",
  }
  const anyRows = buckets.nl.count + buckets.eu.count + buckets.intl.count > 0

  return (
    <div className="rounded-xl border bg-surface p-5">
      <h3 className="text-sm font-semibold">Revenue by region</h3>
      <p className="mb-3 text-xs text-fg-muted">Net after VAT, by customer country. Same price, different take-home.</p>
      {!anyRows ? (
        <p className="text-xs text-fg-subtle">No sales in this period.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {(["nl", "eu", "intl"] as const).map((k) => {
            const b = buckets[k]
            if (b.count === 0) return null
            const net = b.gross - b.vat
            return (
              <div key={k}>
                <div className="flex justify-between font-medium">
                  <span>{meta[k]} <span className="font-normal text-fg-subtle">· {b.count}</span></span>
                  <span className="tabular-nums">{eur(net)}</span>
                </div>
                <div className="text-[11px] text-fg-subtle">
                  gross {eur(b.gross)} − VAT {eur(b.vat)} = net {eur(net)}
                </div>
                {/* Per-country breakdown only where the bucket can hold >1 country. The NL bucket is
                    definitionally single-country, so its row would just duplicate the bucket label. */}
                {k !== "nl" && (
                  <div className="mt-1 space-y-0.5 pl-3">
                    {b.rows.map((r) => (
                      <div key={r.code} className="flex justify-between text-[11px] text-fg-muted">
                        <span>
                          {countryName(r.code)} <span className="text-fg-subtle">· {r.count}</span>
                          {r.unknownVat && <span className="ml-1 text-warning">⚠ vat unknown</span>}
                        </span>
                        <span className="tabular-nums">{eur(r.gross - r.vat)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <p className="border-t pt-2 text-[11px] text-fg-subtle">
            Blocked countries (GB, CH, …) should never appear here — if one does, the Stripe Radar guard is off.
          </p>
        </div>
      )}
    </div>
  )
}

function DeferredCard({ s }: { s: FinanceScope }) {
  const d = s.deferred
  // Insufficient data: no consumption in the last window_days → no rate to base a delivery-cost estimate on.
  // Show "insufficient data" rather than €0 (which would falsely claim delivery is free — worst exactly during
  // a quiet month post-launch).
  const insufficient = !d.est_data_sufficient
  return (
    <div className="rounded-xl border bg-surface p-5">
      <h3 className="text-sm font-semibold">Deferred</h3>
      <p className="mb-3 text-xs text-fg-muted">Revenue collected but not yet delivered.</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-fg-muted">Balance (ex-VAT)</span><span className="font-semibold tabular-nums">{eur(d.balance)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">Credits outstanding</span><span className="tabular-nums">{d.credits.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">− Deferred Stripe fee</span><span className="tabular-nums text-error">{eur(d.deferred_fee)}</span></div>
        <div className="flex justify-between"><span className="text-fg-muted">− Est. cost to deliver <span className="rounded bg-warning-subtle px-1 text-[10px] text-warning">est</span></span>
          <span className="tabular-nums">{insufficient || d.est_future_cost === null ? "—" : eur(d.est_future_cost)}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-medium">Est. future gross</span>
          <span className="font-bold tabular-nums">{insufficient || d.est_future_gross === null ? "insufficient data" : eur(d.est_future_gross)}</span></div>
        {insufficient ? (
          <p className="text-[11px] text-warning">No consumption in the last {d.window_days} days — can't estimate a delivery cost yet.</p>
        ) : (
          <p className="text-[11px] text-fg-subtle">Gross = balance − deferred fee − est. cost. Cost assumes the same method mix + cache rate as the last {d.window_days} days.</p>
        )}
      </div>
    </div>
  )
}

// Trend from frozen snapshots + live entered-OPEX overlay.
function Trend({ snapshots, scope, expenses }: { snapshots: SnapshotRow[]; scope: "external" | "internal"; expenses: ExpenseRow[] }) {
  const [metric, setMetric] = useState<"revenue" | "net" | "split">("revenue")
  const rows = snapshots.filter((r) => r.scope === scope)
  // Real start date, derived from the data — never hardcoded. The nightly cron (02:00 UTC) writes yesterday;
  // after a clean-start DELETE the series is empty until the next run, so this reflects reality either way.
  const startDate = rows.reduce<string | null>((min, r) => (!min || r.snapshot_date < min ? r.snapshot_date : min), null)
  if (rows.length < 2) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h3 className="text-sm font-semibold">Trend</h3>
        <p className="mt-2 text-xs text-fg-muted">
          Measured figures are frozen nightly · entered costs update live.{" "}
          {startDate
            ? `One day recorded so far (${startDate}); the trend fills in as the nightly snapshot accumulates more.`
            : "No snapshots recorded yet — the nightly snapshot (02:00 UTC) writes the first day; the trend starts from there."}
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
        Data from {startDate} · measured figures frozen nightly · entered costs update live (historical net can shift after an expense edit — intended).
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
            <span className="text-3xl font-bold tabular-nums text-fg-strong">{eur(scope.revenue_delivered)}</span>
            {revDelta && <span className={`text-sm font-medium ${revDelta.up ? "text-accent" : "text-error"}`}>{revDelta.txt}</span>}
          </div>
          <p className="mt-1 text-xs text-fg-muted">delivered this period · vs same elapsed days last period</p>
          {/* Deferred is a stock (stand-now), not part of this period's flow — shown as a standing, never summed into the hero. */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-accent/40" />Deferred obligation · held now
            </span>
            <span className="text-xs font-semibold tabular-nums text-fg">{eur(scope.deferred_balance)}</span>
          </div>
        </div>
      </div>

      {/* income statement + cards — one scope in place */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <IncomeStatement s={scope} enteredLines={summary.entered_opex.lines} isExternal={isExternal} />
        <div className="space-y-4">
          <RevenueByRegion s={scope} />
          <BankBridge s={scope} />
          <DeferredCard s={scope} />
        </div>
      </div>

      <Trend snapshots={snapshots} scope={scopeKey} expenses={expenses} />
    </div>
  )
}
