// GELD-blok (ETAPPE 1) — money-model rendering. Server component (geen client-state).
// Data komt uit de admin_geld_summary() RPC (single bron van waarheid, interne accounts
// uitgesloten in de 'external'-scope). Alle bedragen EUR.
import type { ReactNode } from "react"

interface Scope {
  cash_in_gross: number
  vat: number
  vat_known: boolean
  revenue_net: number
  purchased_cr: number
  granted_cr: number
  consumed_cr: number
  balance_cr: number
  per_credit_net: number
  consumed_purchased_cr: number
  recognized_revenue: number
  deferred_revenue: number
  consumed_by_type: { ai_transcription: number; caption: number; ai_summary: number; rag: number }
  cor: { ai_transcription: number; caption: number; ai_summary: number; rag: number; total: number }
  cor_caption_estimated: boolean
  cor_against_revenue: number
  granted_delivery_cost: number
  gross_profit: number
  gross_margin: number | null
}

export interface GeldSummary {
  rates: { decodo_eur_per_gb: number; assemblyai_eur_per_min: number; fixed_monthly_infra_eur: number }
  counts: { external_profiles: number; internal_profiles: number }
  opex_global: {
    infra_monthly: number
    ads: number
    funnel_free_captions: number
    funnel_caption_count: number
    funnel_estimated: boolean
  }
  external: Scope
  internal: Scope
}

// Badge-klassen exact zoals TranscriptList (OKLCH hue-families).
const TYPE_META: Record<string, { label: string; badge: string }> = {
  ai_transcription: { label: "AI-transcriptie", badge: "bg-indigo-subtle text-indigo" },
  caption:          { label: "Auto-captions",  badge: "bg-sky-subtle text-sky" },
  ai_summary:       { label: "AI-samenvatting", badge: "bg-violet-subtle text-violet" },
  rag:              { label: "RAG",            badge: "bg-teal-subtle text-teal" },
}

function eur(n: number, precise = false): string {
  if (precise && n !== 0 && Math.abs(n) < 0.01) return `€${n.toFixed(4)}`
  return `€${n.toFixed(2)}`
}

function pct(n: number | null): string {
  return n == null ? "n.v.t." : `${(n * 100).toFixed(1)}%`
}

function Estimated() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-warning-subtle text-warning px-1.5 py-0.5 text-[10px] font-medium align-middle">
      geschat
    </span>
  )
}

// Eén stap in de P&L-keten.
function Step({
  en, nl, value, tone = "default", children,
}: {
  en: string
  nl: string
  value: string
  tone?: "default" | "in" | "out" | "profit"
  children?: ReactNode
}) {
  const valueColor =
    tone === "in" ? "text-success"
      : tone === "out" ? "text-error"
      : tone === "profit" ? "text-fg-strong"
      : "text-fg"
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">{en}</p>
          <p className="text-[11px] text-fg-subtle">{nl}</p>
        </div>
        <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      </div>
      {children && <div className="mt-2 space-y-1 text-xs text-fg-muted">{children}</div>}
    </div>
  )
}

function CorBreakdown({ scope }: { scope: Scope }) {
  const order = ["ai_transcription", "caption", "ai_summary", "rag"] as const
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((k) => {
        const cost = scope.cor[k]
        const meta = TYPE_META[k]
        return (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}>
            {meta.label} {eur(cost, true)}
            {k === "caption" && cost > 0 && scope.cor_caption_estimated ? <Estimated /> : null}
          </span>
        )
      })}
    </div>
  )
}

function PnLChain({ scope, opex, variant }: { scope: Scope; opex: GeldSummary["opex_global"]; variant: "real" | "internal" }) {
  const opexTotal = opex.infra_monthly + opex.ads + opex.funnel_free_captions + scope.granted_delivery_cost
  const netProfit = scope.gross_profit - opexTotal
  const netMargin = scope.recognized_revenue > 0 ? netProfit / scope.recognized_revenue : null

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Step en="Cash in" nl="Ontvangsten (bruto, incl. btw)" value={eur(scope.cash_in_gross)} tone="in">
        <p>Btw: {scope.vat_known ? eur(scope.vat) : "onbekend (0 aangenomen)"}</p>
        <p>Aangekochte credits: {scope.purchased_cr.toLocaleString()}</p>
      </Step>

      <Step en="Revenue" nl="Omzet (excl. btw)" value={eur(scope.revenue_net)}>
        <p>Geleverd · Recognized: <span className="font-semibold text-fg">{eur(scope.recognized_revenue)}</span></p>
        <p>Uitgesteld · Deferred: <span className="font-semibold text-fg">{eur(scope.deferred_revenue)}</span></p>
        <p className="text-fg-subtle">Purchased-only, granted-first toewijzing · {eur(scope.per_credit_net, true)}/credit</p>
      </Step>

      <Step en="COR" nl="Kostprijs (geleverd verbruik)" value={eur(scope.cor.total, true)} tone="out">
        <CorBreakdown scope={scope} />
        <p className="text-fg-subtle">
          Toe te rekenen aan omzet: {eur(scope.cor_against_revenue, true)} · acquisitie/granted: {eur(scope.granted_delivery_cost, true)}
        </p>
      </Step>

      <Step en="Gross profit" nl="Brutowinst" value={eur(scope.gross_profit)} tone="profit">
        <p>Marge: {pct(scope.gross_margin)}</p>
        <p className="text-fg-subtle">Recognized − COR-op-omzet</p>
      </Step>

      <Step en="OPEX" nl="Operationele kosten" value={eur(opexTotal)} tone="out">
        <p>Infra: {eur(opex.infra_monthly)} / maand</p>
        <p>Ads: {eur(opex.ads)}</p>
        <p>Gratis-caption-funnel: {eur(opex.funnel_free_captions, true)} <Estimated /> <span className="text-fg-subtle">({opex.funnel_caption_count} captions, globaal)</span></p>
        <p>Granted-verbruik (acquisitie): {eur(scope.granted_delivery_cost, true)}</p>
      </Step>

      <Step en="Net profit" nl="Nettowinst" value={eur(netProfit)} tone="profit">
        <p>Marge: {pct(netMargin)}</p>
        <p className="text-fg-subtle">Brutowinst − OPEX {variant === "real" ? "(infra is maandelijks)" : ""}</p>
      </Step>
    </div>
  )
}

export function GeldBlock({ data }: { data: GeldSummary }) {
  const ext = data.external
  const preRevenue = ext.cash_in_gross === 0 && ext.consumed_cr === 0

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Geld — echte economie</h2>
          <p className="text-xs text-fg-muted">
            {data.counts.external_profiles} externe accounts · {data.counts.internal_profiles} interne/test-accounts uitgesloten uit élk cijfer
          </p>
        </div>
      </div>

      {preRevenue && (
        <div className="rounded-lg border border-warning-subtle bg-warning-subtle/40 px-4 py-3 text-sm text-fg">
          <span className="font-semibold">Pre-revenue.</span>{" "}
          Alle tot nu toe gemeten activiteit (aankopen, grants, verbruik) staat op interne/test-accounts.
          De echte externe economie is momenteel €0 — de cijfers hieronder tonen de structuur en vullen zich
          zodra echte gebruikers binnenkomen.
        </div>
      )}

      <PnLChain scope={ext} opex={data.opex_global} variant="real" />

      {/* Intern / test — bewijs met/zonder filter; telt NIET mee in de echte economie. */}
      <details className="rounded-lg border bg-surface-sunken p-4">
        <summary className="cursor-pointer text-sm font-medium text-fg-muted">
          Intern / test (uitgesloten) — {eur(data.internal.cash_in_gross)} testaankopen,{" "}
          {data.internal.consumed_cr.toLocaleString()} cr verbruikt, kost {eur(data.internal.cor.total, true)}
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-xs text-fg-subtle">
            Testverkeer op Khidr&apos;s + CC&apos;s accounts. Bewijst dat de berekening werkt (echte, niet-nul cijfers)
            en toont wat het testen tot nu toe kostte. Telt niet mee in de echte economie hierboven.
          </p>
          <PnLChain scope={data.internal} opex={data.opex_global} variant="internal" />
        </div>
      </details>
    </div>
  )
}
