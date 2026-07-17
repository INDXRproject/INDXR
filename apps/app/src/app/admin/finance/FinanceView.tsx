"use client"

import { useState, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@indxr/shared/components/ui/switch"
import { eur, pct, TYPE_META } from "../adminTypes"
import type { FinanceSummary, FinanceScope, SnapshotRow, ExpenseRow, CostConfigRow, EnteredOpexLine } from "./financeTypes"
import { shiftAnchor, presets, atLowerBound, type PeriodKind } from "./periods"
import { accrualForRange } from "./accrual"
import { FinanceSettings } from "./SettingsDialog"

interface PeriodProp {
  kind: PeriodKind
  from: string
  to: string
  label: string
  toDate: boolean
  anchorISO: string
  businessStartISO: string
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

// F15 — drivers. Rates live in cost_config; drivers are measured. Each cost row shows driver × rate = amount
// so a human can recompute it without opening the code. That is the reason this table exists.
type Rates = FinanceSummary["rates"]

function fmtNum(n: number, dp: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}
// A tariff shown with just enough precision to stay exact (€2.99, €0.00322/min, €0.000129/1k).
function rate(n: number | null): string {
  if (n == null) return "€0"
  if (Math.abs(n) >= 1) return `€${n.toFixed(2)}`
  return `€${Number(n.toPrecision(3))}`
}

// The measured driver behind a COR method, as an expression. null → no driver (nothing consumed, or RAG).
function corDriver(k: (typeof COR_METHODS)[number], s: FinanceScope, r: Rates): string | null {
  const d = s.drivers
  if (k === "ai_transcription") {
    const t = d.ai_transcription
    const parts = [`${fmtNum(t.audio_seconds / 60, 1)} min × ${rate(r.assemblyai_eur_per_min)}/min`]
    if (t.proxy_bytes > 0) parts.push(`${fmtNum(t.proxy_bytes / 1e9, 2)} GB × ${rate(r.decodo_eur_per_gb)}/GB`)
    return t.audio_seconds > 0 || t.proxy_bytes > 0 ? parts.join(" + ") : null
  }
  if (k === "caption") {
    if (d.caption.proxy_bytes === 0) return null
    return `${fmtNum(d.caption.proxy_bytes / 1e9, 3)} GB × ${rate(r.decodo_eur_per_gb)}/GB`
  }
  if (k === "ai_summary") {
    const a = d.ai_summary
    if (a.input_tokens === 0 && a.output_tokens === 0) return null
    const parts = [`${fmtNum(Math.max(a.input_tokens - a.cache_tokens, 0), 0)} in × ${rate(r.deepseek_eur_per_1k_input_tokens)}/1k`]
    if (a.cache_tokens > 0) parts.push(`${fmtNum(a.cache_tokens, 0)} cache × ${rate(r.deepseek_eur_per_1k_cache_hit_tokens)}/1k`)
    parts.push(`${fmtNum(a.output_tokens, 0)} out × ${rate(r.deepseek_eur_per_1k_output_tokens)}/1k`)
    return parts.join(" + ")
  }
  return null
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
// Fixed column grid so COST · CREDITS · €/CREDIT never shift with content — a column stays at the same
// x-position regardless of what a cell holds. Numbers right-aligned, tabular-nums.
const COR_GRID = "grid grid-cols-[minmax(0,1fr)_5.5rem_5rem_7rem] gap-x-4"

function CorTable({ s, r }: { s: FinanceScope; r: Rates }) {
  const cor = s.cor
  const aiCache = s.cache_savings.ai_transcription
  const capCache = s.cache_savings.caption
  const cacheSub: Partial<Record<(typeof COR_METHODS)[number], string | null>> = {
    ai_transcription: aiCache.total_jobs > 0 ? `${pct(aiCache.pct)} from cache · saved ${eur(aiCache.saved_eur, true)}` : null,
    caption: capCache.total_count > 0 ? `${pct(capCache.pct)} from cache · saved ${eur(capCache.saved_eur, true)}` : null,
  }
  const abm = cor.against_revenue_by_method
  // Against-revenue of the usage methods + storage (NOT the fee — the fee has its own recognised/deferred line).
  const usageAgainst = abm.ai_transcription + abm.caption + abm.ai_summary + abm.rag + abm.storage
  // Goodwill = full measured COR that was NOT matched to paid revenue (granted-credit delivery). Booked in OPEX.
  const goodwill = cor.measured_total - usageAgainst
  const fee = cor.payment_fee
  const stor = s.drivers.storage
  const storBillable = Math.max(stor.gb - stor.free_gb, 0)
  return (
    <div className="mt-1 rounded-lg border bg-surface-sunken/40">
      <div className={`${COR_GRID} border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle`}>
        <span>Method</span><span className="text-right">Cost</span><span className="text-right">Credits</span><span className="text-right">€ / credit</span>
      </div>
      {COR_METHODS.map((k) => {
        const credits = s.consumed_by_type[k]
        // Driver × rate = amount. RAG has no external call, so instead of a driver it carries its assumption.
        const driver = corDriver(k, s, r)
        const ragNote = k === "rag" ? "assumed ~€0 · reshape of existing transcript, no external API call" : null
        return (
          <div key={k} className={`${COR_GRID} items-center px-3 py-2 text-xs`}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={`w-fit rounded-full px-2 py-0.5 font-medium ${TYPE_META[k].bg} ${TYPE_META[k].text}`}>{TYPE_META[k].label}</span>
              {driver && <span className="text-[11px] tabular-nums text-fg-subtle">{driver} = {corCost(cor[k])}</span>}
              {ragNote && <span className="text-[11px] text-fg-subtle">{ragNote}</span>}
              {cacheSub[k] && <span className="text-[11px] text-fg-subtle">{cacheSub[k]}</span>}
            </div>
            <span className="text-right font-semibold tabular-nums text-fg">{corCost(cor[k])}</span>
            <span className="text-right tabular-nums text-fg-muted">{credits.toLocaleString()}</span>
            <span className="text-right tabular-nums text-fg-muted">{corUnit(credits, cor[k])}</span>
          </div>
        )
      })}
      {/* storage — a quiet row, no per-credit unit. Driver explains the amount (incl. the €0 free-tier case). */}
      <div className={`${COR_GRID} items-center px-3 py-2 text-xs`}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="w-fit rounded-full bg-warning-subtle px-2 py-0.5 font-medium text-warning-fg">Storage (R2)</span>
          <span className="text-[11px] tabular-nums text-fg-subtle">
            {storBillable > 0
              ? `${fmtNum(storBillable, 2)} GB over ${fmtNum(stor.free_gb, 0)} × ${rate(r.r2_usd_per_gb_month)}/GB·mo × ${r.usd_eur_rate ?? 1} €/$ × ${stor.days_win}/${stor.days_month} days = ${corCost(cor.storage)}`
              : `${fmtNum(stor.gb, 2)} GB stored · within ${fmtNum(stor.free_gb, 0)} GB free tier = ${corCost(cor.storage)}`}
          </span>
          {/* F3: before the per-user byte series (daily_library_bytes) spans this period, storage prorates the
              CURRENT library size instead — flag it as an approximation. */}
          {s.storage_approx && (
            <span className="text-[11px] text-warning-fg" title="No per-user byte history for this period yet — prorated from the current library size (daily_library_bytes fills in nightly).">
              ≈ approx · from current library size
            </span>
          )}
        </div>
        <span className="text-right font-semibold tabular-nums text-fg">{corCost(cor.storage)}</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
        <span className="text-right tabular-nums text-fg-muted">—</span>
      </div>
      {/* Total FULL measured COR — this is what the rows sum to (Σ Cost). */}
      <div className={`${COR_GRID} items-center border-t px-3 py-2 text-xs`}>
        <span className="font-semibold text-fg">Total measured COR</span>
        <span className="text-right font-bold tabular-nums text-fg">{corCost(cor.measured_total)}</span>
        <span className="text-right tabular-nums text-fg-subtle">—</span>
        <span className="text-right tabular-nums text-fg-subtle">—</span>
      </div>
      {/* The split: full COR bridges to against-revenue (= the Cost of revenue figure above) + goodwill (an OPEX row). */}
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
    </div>
  )
}

// OPEX drawn as a table (Category · Source · Cost). Goodwill (granted-credit delivery) is a visible row here,
// not an unexplained gap between the COR line and its breakdown.
const OPEX_GRID = "grid grid-cols-[minmax(0,1fr)_5rem_6.5rem] gap-x-4"

function OpexTable({ s, r, enteredLines, isExternal }: { s: FinanceScope; r: Rates; enteredLines: EnteredOpexLine[]; isExternal: boolean }) {
  const m = s.measured_opex
  const dv = s.drivers
  // costText overrides the €-rendering (used to show "—" for an unavailable reconciliation — not €0).
  const measuredRows: { name: string; hint?: string; cost: number; costText?: string }[] = []
  // Stripe fee is NOT here anymore — it moved to COR (F22), shown in the COR breakdown as recognised/deferred.
  // Radar screens every attempt (successful+declined+blocked) at €rate; free through free_until. driver × rate.
  const rd = m.radar
  if (rd && rd.screens > 0) {
    const trial = rd.free_until && rd.billable < rd.screens ? ` · free until ${rd.free_until}` : ""
    const radarHint = `${rd.billable} billable of ${rd.screens} screened (${rd.successful} ok · ${rd.declined} declined · ${rd.blocked} blocked) × ${rate(rd.rate)}${trial}`
    measuredRows.push({ name: "Fraud screening (Radar)", hint: radarHint, cost: m.radar_fee })
  }
  // Goodwill = granted credits delivered at their blended delivery cost. Funnels = free-caption bytes × Decodo rate.
  const gwCr = dv.goodwill.granted_credits
  measuredRows.push({
    name: "Goodwill — granted credits used",
    hint: gwCr > 0 ? `${fmtNum(gwCr, 0)} granted credits × ~${rate(m.goodwill / gwCr)}/credit` : "no granted credits used this period",
    cost: m.goodwill,
  })
  measuredRows.push({
    name: "Free-caption funnel — logged-in",
    hint: `${fmtNum(dv.funnel_loggedin.proxy_bytes / 1e9, 3)} GB × ${rate(r.decodo_eur_per_gb)}/GB`,
    cost: m.funnel_loggedin,
  })
  measuredRows.push({
    name: "Free-caption funnel — anonymous",
    hint: `${fmtNum(dv.funnel_anon.proxy_bytes / 1e9, 3)} GB × ${rate(r.decodo_eur_per_gb)}/GB`,
    cost: m.funnel_anon,
  })
  // F18: proxy egress that delivered no paid unit — failed/blocked jobs + playlist-info/metadata/caption
  // scrapes. When 0 (forward-only, none measured yet) the hint explains what the line will hold.
  const po = dv.proxy_overhead
  const CAT_LABEL: Record<string, string> = { metadata: "metadata", playlist_info: "playlist-info", caption_failed: "caption fails" }
  const poParts: string[] = []
  if (po.fail_bytes > 0) poParts.push(`${fmtNum(po.fail_bytes / 1e9, 3)} GB failed jobs`)
  for (const [cat, b] of Object.entries(po.by_category)) poParts.push(`${fmtNum(b / 1e9, 3)} GB ${CAT_LABEL[cat] ?? cat}`)
  measuredRows.push({
    name: "Proxy overhead",
    hint: po.total_bytes > 0
      ? `${fmtNum(po.total_bytes / 1e9, 3)} GB × ${rate(r.decodo_eur_per_gb)}/GB${poParts.length ? ` · ${poParts.join(" · ")}` : ""}`
      : "proxy spent outside delivered jobs (failed jobs · playlist-info · metadata · blocked captions) — none measured yet this period",
    cost: m.proxy_overhead,
  })
  // F17: Decodo reconciliation (external scope only). billed · measured · gap. 'unavailable' → cost "—"
  // (a bill we couldn't fetch ≠ a gap of €0), never a fabricated 100% gap.
  const rc = s.reconciliation
  if (isExternal && rc.status !== "not_applicable") {
    const lastOk = rc.last_success_at ? new Date(rc.last_success_at).toLocaleDateString() : null
    if (rc.status === "unavailable") {
      measuredRows.push({
        name: "Proxy reconciliation (Decodo)",
        hint: `Decodo billed unavailable${lastOk ? ` · last fetched ${lastOk}` : " · never fetched yet (nightly 02:00 UTC)"} — no gap shown until real data.`,
        cost: 0,
        costText: "—",
      })
    } else {
      // billed and measured are compared over the SAME days (the covered days) — a period wider than the
      // fetched days no longer inflates measured. State the coverage honestly so a 3-of-17-day gap isn't
      // read as a claim about the whole month.
      const dataFrom = rc.data_from ? new Date(rc.data_from + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null
      const cov = `gap over ${rc.coverage_days} of ${rc.period_days} days${dataFrom ? ` · Decodo data starts ${dataFrom}` : ""}`
      measuredRows.push({
        name: "Proxy reconciliation (Decodo)",
        hint: `billed ${fmtNum((rc.billed_bytes ?? 0) / 1e9, 3)} GB · measured ${fmtNum((rc.measured_bytes ?? 0) / 1e9, 3)} GB · gap ${fmtNum((rc.gap_bytes ?? 0) / 1e9, 3)} GB × ${rate(r.decodo_eur_per_gb)}/GB · ${cov}`,
        cost: rc.gap_cost ?? 0,
      })
    }
  }

  return (
    <div className="mt-1 rounded-lg border bg-surface-sunken/40">
      <div className={`${OPEX_GRID} border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle`}>
        <span>Category</span><span className="text-center">Source</span><span className="text-right">Cost</span>
      </div>
      {isExternal && enteredLines.map((l) => {
        const hint = l.recurrence === "monthly"
          ? `${eur(l.amount)} / month · ${l.days_applied} of ${l.days_total} days`
          : l.recurrence === "yearly"
          ? `${eur(l.amount)} / year · ${l.days_applied} of ${l.days_total} days`
          : l.description || `${l.days_applied} day${l.days_applied === 1 ? "" : "s"}`
        return (
          <div key={l.id} className={`${OPEX_GRID} items-center px-3 py-2 text-xs`}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium capitalize text-fg">{l.category}</span>
              <span className="text-[11px] text-fg-subtle">{hint}</span>
            </div>
            <span className="text-center"><Src kind="entered" /></span>
            <span className="text-right font-semibold tabular-nums text-fg">{eur(l.period_amount)}</span>
          </div>
        )
      })}
      {measuredRows.map((row) => (
        <div key={row.name} className={`${OPEX_GRID} items-center px-3 py-2 text-xs`}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium text-fg">{row.name}</span>
            {row.hint && <span className="text-[11px] text-fg-subtle">{row.hint}</span>}
          </div>
          <span className="text-center"><Src kind="measured" /></span>
          <span className="text-right font-semibold tabular-nums text-fg">{row.costText ?? eur(row.cost, true)}</span>
        </div>
      ))}
      <p className="border-t px-3 py-2 text-[11px] text-fg-subtle">
        Entered costs carry their own dates, sliced to the period. Measured costs come from actual daily usage.
      </p>
    </div>
  )
}

function IncomeStatement({ s, r, enteredLines, isExternal }: { s: FinanceScope; r: Rates; enteredLines: EnteredOpexLine[]; isExternal: boolean }) {
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
        {corOpen && <CorTable s={s} r={r} />}
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
        {opexOpen && <OpexTable s={s} r={r} enteredLines={enteredLines} isExternal={isExternal} />}
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
  // Only truly empty (zero snapshots) shows text-only; a single day renders as one point, ≥2 as the series.
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-surface p-5">
        <h3 className="text-sm font-semibold">Trend</h3>
        <p className="mt-2 text-xs text-fg-muted">
          Measured figures are frozen nightly · entered costs update live. No snapshots recorded yet — the nightly snapshot (02:00 UTC) writes the first day; the trend starts from there.
          {" "}The statement above is recomputed live and can cover any range back to launch; this trend only spans days with a saved snapshot — that difference is expected, not a gap in the data.
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
      <div className={`flex h-32 items-end gap-1 ${bars.length === 1 ? "justify-center" : ""}`}>
        {bars.map((b) => (
          <div key={b.date} className={`flex flex-col items-center gap-1 ${bars.length === 1 ? "w-16" : "flex-1"}`} title={`${b.date}: ${eur(b.val)}`}>
            <div className="flex w-full items-end justify-center" style={{ height: "100%" }}>
              <div className={`w-full rounded-t ${b.val >= 0 ? "bg-accent" : "bg-error"}`}
                style={{ height: `${(Math.abs(b.val) / max) * 100}%`, minHeight: b.val !== 0 ? "2px" : "0" }} />
            </div>
          </div>
        ))}
      </div>
      {bars.length === 1 && (
        <p className="mt-2 text-center text-[11px] text-fg-subtle">One day recorded ({startDate}) — a line appears once a second nightly snapshot lands.</p>
      )}
      <p className="mt-2 text-[11px] text-fg-subtle">
        Data from {startDate} · measured figures frozen nightly · entered costs update live (historical net can shift after an expense edit — intended). The live statement above can reach back to launch even where this trend has no snapshot yet.
      </p>
    </div>
  )
}

function PeriodPicker({ period, nowISO }: { period: PeriodProp; nowISO: string }) {
  const router = useRouter()
  const go = (params: Record<string, string>) => {
    const q = new URLSearchParams(params)
    router.push(`/admin/finance?${q.toString()}`)
  }
  // `now` comes from the server (generatedAt), not new Date(), so preset matching + input bounds are identical
  // on server and client (no hydration mismatch).
  const now = new Date(nowISO)
  const todayISO = nowISO.slice(0, 10)
  const businessStart = new Date(period.businessStartISO + "T00:00:00Z")
  const presetList = presets(now, businessStart)
  const curFrom = period.from.slice(0, 10)

  const [customOpen, setCustomOpen] = useState(period.kind === "custom")
  const [cFrom, setCFrom] = useState(period.kind === "custom" ? curFrom : period.businessStartISO)
  const [cTo, setCTo] = useState(
    period.kind === "custom"
      ? new Date(new Date(period.to).getTime() - 86400000).toISOString().slice(0, 10) // to is exclusive → show last included day
      : todayISO,
  )

  const nav = (dir: -1 | 1) => {
    if (period.kind === "custom" || period.kind === "alltime") return
    const anchor = new Date(period.anchorISO + "T00:00:00Z")
    const next = shiftAnchor(period.kind, anchor, dir)
    if (dir === 1 && next > now) return // cap at running period
    go({ period: period.kind, anchor: next.toISOString().slice(0, 10) })
  }
  const applyCustom = () => {
    // The date input is inclusive ("to 31 Mar" includes the 31st); the RPC window is [from, to) → send to+1 day.
    const toExcl = new Date(new Date(cTo + "T00:00:00Z").getTime() + 86400000).toISOString().slice(0, 10)
    go({ period: "custom", anchor: cFrom, to: toExcl })
  }
  const backBlocked = atLowerBound(period.kind, period.anchorISO, businessStart)
  const isNavKind = period.kind !== "custom" && period.kind !== "alltime"

  return (
    <div className="flex flex-col gap-2">
      {/* Presets (F10) — quarter is the OSS filing cycle, not decoration. */}
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {presetList.map((p) => {
          const active = period.kind === p.kind && curFrom === p.matchFromISO
          return (
            <button key={p.key}
              onClick={() => { setCustomOpen(false); go({ period: p.kind, ...(p.anchorISO ? { anchor: p.anchorISO } : {}) }) }}
              className={`rounded-md border px-2.5 py-1 ${active ? "bg-accent-subtle font-medium text-accent" : "text-fg-muted hover:bg-surface-elevated"}`}>
              {p.label}
            </button>
          )
        })}
        <button onClick={() => setCustomOpen((v) => !v)}
          className={`rounded-md border px-2.5 py-1 ${period.kind === "custom" ? "bg-accent-subtle font-medium text-accent" : "text-fg-muted hover:bg-surface-elevated"}`}>
          Custom
        </button>
      </div>

      {/* Custom range — inputs floor at the business start (F13), cap at today. */}
      {customOpen && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs text-fg-muted">from</span>
          <input type="date" value={cFrom} min={period.businessStartISO} max={todayISO}
            onChange={(e) => setCFrom(e.target.value)} className="rounded-md border bg-bg px-2 py-1" />
          <span className="text-xs text-fg-muted">to</span>
          <input type="date" value={cTo} min={cFrom} max={todayISO}
            onChange={(e) => setCTo(e.target.value)} className="rounded-md border bg-bg px-2 py-1" />
          <button onClick={applyCustom} disabled={!cFrom || !cTo || cFrom > cTo}
            className="rounded-md border px-2.5 py-1 hover:bg-surface-elevated disabled:opacity-40">Apply</button>
        </div>
      )}

      {/* Arrows scroll within the active preset's unit (e.g. "This month" + ← = previous month). No second
          unit-toggle row — the preset already sets the unit. The label says which period you're on. */}
      {isNavKind && (
        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} disabled={backBlocked}
            className="rounded-md border px-2 py-1 text-sm hover:bg-surface-elevated disabled:opacity-40"
            aria-label="Previous period" title={backBlocked ? `Business starts ${period.businessStartISO}` : undefined}>←</button>
          <span className="min-w-[8rem] text-center text-sm font-medium">{period.label}{period.toDate ? " · to date" : ""}</span>
          <button onClick={() => nav(1)} disabled={period.toDate}
            className="rounded-md border px-2 py-1 text-sm hover:bg-surface-elevated disabled:opacity-40" aria-label="Next period">→</button>
        </div>
      )}
      {period.kind === "alltime" && (
        <span className="text-sm font-medium text-fg-muted">{period.label} · from {period.businessStartISO}</span>
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
  // Delta caption honestly names what it compares: a running period is month-to-date vs the same elapsed span
  // last period; a completed period is whole-vs-whole; all-time has no prior period.
  const deltaCaption =
    period.kind === "alltime" ? `since ${period.businessStartISO}`
      : period.toDate ? "vs same elapsed days last period"
      : "vs the whole previous period"
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
        <PeriodPicker period={period} nowISO={generatedAt} />
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
          <p className="mt-1 text-xs text-fg-muted">{deltaCaption}</p>
        </div>
        <div className="rounded-xl border bg-surface p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Revenue</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-fg-strong">{eur(scope.revenue_delivered)}</span>
            {revDelta && <span className={`text-sm font-medium ${revDelta.up ? "text-accent" : "text-error"}`}>{revDelta.txt}</span>}
          </div>
          <p className="mt-1 text-xs text-fg-muted">delivered this period · {deltaCaption}</p>
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
        <IncomeStatement s={scope} r={summary.rates} enteredLines={summary.entered_opex.lines} isExternal={isExternal} />
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
