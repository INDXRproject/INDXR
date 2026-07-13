"use client"

import { useState, type ReactNode } from "react"
import { Switch } from "@indxr/shared/components/ui/switch"
import { eur, pct, TYPE_META, type GeldScope, type GeldSummary } from "../adminTypes"

const CONNECT = "before:absolute before:left-1/2 before:-top-3 before:h-3 before:w-px before:bg-border"

// Proportional segmented bar. Falls back to a muted track when the total is 0.
function SplitBar({ segments }: { segments: { value: number; cls: string; title: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) {
    return <div className="h-2.5 w-full rounded-full bg-surface-sunken" />
  }
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div key={i} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} title={s.title} />
        ) : null
      )}
    </div>
  )
}

function Line({
  label, value, marginLabel, accent, children,
}: {
  label: string
  value: string
  marginLabel?: string
  accent?: "in" | "cost" | "profit"
  children?: ReactNode
}) {
  const valueColor =
    accent === "in" ? "text-success" : accent === "cost" ? "text-error" : "text-fg-strong"
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</span>
        <div className="flex items-baseline gap-2">
          {marginLabel && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              {marginLabel}
            </span>
          )}
          <span className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</span>
        </div>
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

// Operator connector between two P&L lines (e.g. "− VAT €0.00").
function Op({ text }: { text: string }) {
  return (
    <div className={`relative flex justify-center py-2 ${CONNECT}`}>
      <span className="rounded-full border bg-bg px-2.5 py-0.5 text-[11px] text-fg-muted">{text}</span>
    </div>
  )
}

function PnL({
  scope, opex, storageCor,
}: { scope: GeldScope; opex: GeldSummary["opex_global"]; storageCor: number }) {
  const [opexOpen, setOpexOpen] = useState(false)

  // Estimated COR on the deferred (unconsumed purchased) credits — projection, labelled as such.
  const avgCostPerCr = scope.consumed_cr > 0 ? scope.cor.total / scope.consumed_cr : 0
  const deferredCr = Math.max(0, scope.purchased_cr - scope.consumed_purchased_cr)
  const estCorDeferred = deferredCr * avgCostPerCr

  // Storage is a global COR line (R2 free tier is account-level) — folded into effective COR.
  const corEff = scope.cor_against_revenue + storageCor
  const grossProfit = scope.recognized_revenue - corEff
  const grossMargin = scope.recognized_revenue > 0 ? grossProfit / scope.recognized_revenue : null

  const opexTotal =
    opex.infra_monthly + opex.ads + opex.funnel_free_captions_anon +
    scope.funnel_free_caption_cost + scope.granted_delivery_cost
  const netProfit = grossProfit - opexTotal
  const netMargin = scope.recognized_revenue > 0 ? netProfit / scope.recognized_revenue : null

  return (
    <div>
      <Line label="Cash in · incl. VAT" value={eur(scope.cash_in_gross)} accent="in">
        <p className="text-xs text-fg-muted">
          Gross received via Stripe · {scope.purchased_cr.toLocaleString()} credits purchased
        </p>
      </Line>

      <Op text={`− VAT ${scope.vat_known ? eur(scope.vat) : "(unknown, 0 assumed)"}`} />

      <Line label="Revenue · excl. VAT" value={eur(scope.revenue_net)}>
        <SplitBar
          segments={[
            { value: scope.recognized_revenue, cls: "bg-success", title: "Recognized" },
            { value: scope.deferred_revenue, cls: "bg-warning", title: "Deferred" },
          ]}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-fg">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success align-middle" />
            Recognized (delivered) <span className="font-semibold">{eur(scope.recognized_revenue)}</span>
          </span>
          <span className="text-fg">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning align-middle" />
            Deferred (obligation) <span className="font-semibold">{eur(scope.deferred_revenue)}</span>
          </span>
        </div>
      </Line>

      <Op text={`− COR ${eur(corEff, true)}`} />

      <Line label="Cost of revenue" value={eur(corEff, true)} accent="cost">
        <SplitBar
          segments={[
            { value: scope.cor.ai_transcription, cls: TYPE_META.ai_transcription.bar, title: "AI transcription" },
            { value: scope.cor.caption, cls: TYPE_META.caption.bar, title: "Auto-captions" },
            { value: scope.cor.ai_summary, cls: TYPE_META.ai_summary.bar, title: "AI summary" },
            { value: scope.cor.rag, cls: TYPE_META.rag.bar, title: "RAG" },
            { value: storageCor, cls: "bg-fg-muted", title: "R2 storage" },
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          {(["ai_transcription", "caption", "ai_summary", "rag"] as const).map((k) => (
            <span
              key={k}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_META[k].bg} ${TYPE_META[k].text}`}
            >
              {TYPE_META[k].label} {eur(scope.cor[k], true)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-fg-muted">
            R2 storage {eur(storageCor, true)}
          </span>
        </div>
        <p className="text-xs text-fg-muted">
          Real (delivered): <span className="font-semibold text-fg">{eur(corEff, true)}</span>
          {" · "}
          <span className="rounded bg-warning-subtle px-1 text-warning">est.</span> on deferred:{" "}
          <span className="font-semibold text-fg">{eur(estCorDeferred, true)}</span>
          {" · caption & storage measured"}
        </p>
      </Line>

      <div className="relative py-2">
        <div className="absolute left-1/2 -top-1 h-1 w-px bg-border" />
      </div>

      <Line
        label="Gross profit"
        value={eur(grossProfit)}
        marginLabel={`margin ${pct(grossMargin)}`}
        accent="profit"
      >
        <p className="text-xs text-fg-muted">Recognized revenue − real cost of revenue (incl. storage)</p>
      </Line>

      <Op text={`− OPEX ${eur(opexTotal)}`} />

      <Line label="Operating expenses" value={eur(opexTotal)} accent="cost">
        <button
          onClick={() => setOpexOpen((v) => !v)}
          className="text-xs text-accent hover:underline"
        >
          {opexOpen ? "Hide breakdown" : "Show breakdown"}
        </button>
        {opexOpen && (
          <div className="grid gap-1 text-xs text-fg-muted sm:grid-cols-2">
            <span>Infra (fixed): <span className="font-semibold text-fg">{eur(opex.infra_monthly)}</span> / mo</span>
            <span>Ads / marketing: <span className="font-semibold text-fg">{eur(opex.ads)}</span></span>
            <span>
              Free-caption funnel · logged-in:{" "}
              <span className="font-semibold text-fg">{eur(scope.funnel_free_caption_cost, true)}</span>
            </span>
            <span>
              Free-caption funnel · anon (global):{" "}
              <span className="font-semibold text-fg">{eur(opex.funnel_free_captions_anon, true)}</span>
            </span>
            <span>Granted-credit delivery: <span className="font-semibold text-fg">{eur(scope.granted_delivery_cost, true)}</span></span>
          </div>
        )}
      </Line>

      <div className="relative py-2">
        <div className="absolute left-1/2 -top-1 h-1 w-px bg-border" />
      </div>

      <Line
        label="Net profit"
        value={eur(netProfit)}
        marginLabel={`margin ${pct(netMargin)}`}
        accent="profit"
      >
        <p className="text-xs text-fg-muted">Gross profit − operating expenses</p>
      </Line>
    </div>
  )
}

export function FinanceView({ data }: { data: GeldSummary }) {
  const [showTest, setShowTest] = useState(false)
  const ext = data.external
  const preRevenue = ext.cash_in_gross === 0 && ext.consumed_cr === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-fg-muted">
            Real economy · {data.counts.internal_profiles} internal/test accounts excluded from every figure
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <Switch checked={showTest} onCheckedChange={setShowTest} />
          Show internal / test traffic
        </label>
      </div>

      {preRevenue && (
        <div className="rounded-xl border border-warning-border bg-warning-subtle/40 px-4 py-3 text-sm">
          <span className="font-semibold">Pre-revenue.</span> All measured activity so far is on
          internal/test accounts. The real external economy is currently €0 — the chain below shows the
          structure and populates as real users arrive.
        </div>
      )}

      <div className="max-w-xl">
        <PnL scope={ext} opex={data.opex_global} storageCor={data.cor_storage.eur} />
      </div>

      {showTest && (
        <div className="max-w-xl rounded-xl border border-dashed bg-surface-sunken p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">
            Internal / test traffic — excluded from the real economy
          </p>
          <PnL scope={data.internal} opex={data.opex_global} storageCor={0} />
        </div>
      )}
    </div>
  )
}
