// Shared pricing presentation — one design for BOTH surfaces (marketing /pricing en app
// /dashboard/billing). Driven volledig door `prominent` / `mostPopular` uit pricing.ts (single
// source of truth).
//
// Two interaction models on the same cards:
//  - cta mode (pricing): each prominent card renders its own `renderCta` button. You don't buy
//    here yet on the app — but marketing does its auth-aware navigate.
//  - select mode (billing): the whole card is a native radio (select-then-buy). Exactly one
//    selected, keyboard works for free (native radios: arrows move + select, Space selects).
//    The ToS + single buy button are injected by the parent via `betweenSlot`, between the grid
//    and the Try strip. No per-card buy buttons in this mode.
//
// Universeel component (GEEN "use client"): pure/presentational, no hooks — it renders SSR on
// marketing (SEO intact, only the CTA is a client island) én inside the app's client tree
// (where the radio's checked/onChange come from the parent's state).

import type { ReactNode } from "react"
import { PricingPackage, PACKAGES, formatEur, formatEurExact, pricePerCredit } from "../../lib/pricing"

/**
 * Gedeelde CTA-knop-chroom zodat beide oppervlakken visueel identieke knoppen renderen (geen
 * design-drift). Alleen de klik-actie verschilt per surface.
 */
export function pricingCtaClassName(featured?: boolean, compact?: boolean): string {
  // Stijl B (2026-11-06): square, 2px ink border. On the amber (recommended) card an amber button
  // would vanish, so the featured CTA is ink-filled; every other CTA is the amber primary.
  const base = compact
    ? "px-4 py-2 border-2 border-[var(--fg-strong)] font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
    : "w-full py-3 border-2 border-[var(--fg-strong)] font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
  return featured
    ? `${base} bg-[var(--fg-strong)] text-[var(--bg)] hover:opacity-90`
    : `${base} bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)]`
}

interface Selection {
  selectedId: string
  onSelect: (id: string) => void
  /** Accessible label for the radiogroup. */
  groupLabel?: string
}

interface PricingTiersProps {
  // Per-pakket CTA (cta mode = marketing). Niet gebruikt in select mode — daar is elke kaart,
  // inclusief Try, een radioknop en koop je via één knop in de footerSlot.
  renderCta?: (pkg: PricingPackage, opts?: { compact?: boolean }) => ReactNode
  // Aanwezig = select mode: álle pakketten (Starter/Plus/Power én Try) worden radioknoppen.
  selection?: Selection
  // Onder de hele lijst (billing: ToS-checkbox + één koopknop die de selectie weerspiegelt).
  footerSlot?: ReactNode
}

const INK = "border-[var(--fg-strong)]"

export function PricingTiers({ renderCta, selection, footerSlot }: PricingTiersProps) {
  const prominent = PACKAGES.filter((p) => p.prominent)
  const secondary = PACKAGES.filter((p) => !p.prominent)

  // One ruled grid (stijl B): the three cards share their 2px ink borders instead of floating apart.
  const grid = `grid grid-cols-1 sm:grid-cols-3 max-w-5xl mx-auto border-2 ${INK}`

  return (
    <div>
      {selection ? (
        <div role="radiogroup" aria-label={selection.groupLabel ?? "Choose a credit package"} className={grid}>
          {prominent.map((pkg, i) => (
            <ProminentCard key={pkg.id} pkg={pkg} index={i} selection={selection} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {prominent.map((pkg, i) => (
            <ProminentCard key={pkg.id} pkg={pkg} index={i} cta={renderCta?.(pkg)} />
          ))}
        </div>
      )}

      {/* Secundaire strip (Try) — bewust niet als gelijkwaardige vierde kaart (ADR-058), maar in
          select mode wél selecteerbaar zodat alle vier pakketten hetzelfde koop-pad delen. */}
      {secondary.length > 0 && (
        <div className="mt-8 max-w-5xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg-muted)] mb-3">
            Just want to try it on a single project first?
          </p>
          {secondary.map((pkg) => {
            const onAmber = !!selection && selection.selectedId === pkg.id
            const info = (
              <div className="min-w-0 flex-1">
                <h4 className={`text-base font-bold ${onAmber ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-strong)]"}`}>
                  {pkg.name} · {formatEur(pkg.priceEur)}
                </h4>
                <p className={`text-sm ${onAmber ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-subtle)]"}`}>
                  {pkg.credits.toLocaleString()} credits · {formatEurExact(pricePerCredit(pkg))}/min — {pkg.audience}
                </p>
              </div>
            )
            if (selection) {
              const selected = selection.selectedId === pkg.id
              return (
                <label
                  key={pkg.id}
                  className={`flex items-center gap-4 border-2 ${INK} p-4 cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
                    selected ? "bg-[var(--accent)]" : "bg-[var(--bg)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="billing-plan"
                    className="sr-only"
                    checked={selected}
                    onChange={() => selection.onSelect(pkg.id)}
                  />
                  {info}
                </label>
              )
            }
            return (
              <div key={pkg.id} className={`border-2 ${INK} bg-[var(--bg)] p-4 flex flex-wrap items-center gap-4`}>
                {info}
                <div className="shrink-0">{renderCta?.(pkg, { compact: true })}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Billing: ToS-checkbox + één koopknop, onder de hele lijst (weerspiegelt de selectie). */}
      {footerSlot}
    </div>
  )
}

// Dividers between the three cells of the ruled grid: bottom rule on mobile (stacked), right rule
// from sm up, none after the last cell.
function cellRule(index: number, count: number): string {
  if (index === count - 1) return ""
  return `border-b-2 sm:border-b-0 sm:border-r-2 ${INK}`
}

// Amber = recommended (cta mode) or selected (select mode). Text switches to ink-on-amber.
const AMBER = "bg-[var(--accent)]"

function CardInner({ pkg, amber }: { pkg: PricingPackage; amber: boolean }) {
  const ppc = pricePerCredit(pkg)
  // On amber every text colour is ink-on-accent (dark in both themes); otherwise the normal scale.
  const strong = amber ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-strong)]"
  const soft = amber ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-subtle)]"
  const rule = amber ? "border-[var(--fg-on-accent)]" : INK
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className={`text-2xl font-bold ${strong}`}>{pkg.name}</h3>
        {pkg.mostPopular && (
          <span className={`border-2 ${rule} px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${strong}`}>
            Recommended
          </span>
        )}
      </div>
      <p className={`text-5xl font-bold tracking-[-0.04em] ${strong}`}>{formatEur(pkg.priceEur)}</p>
      <p className={`mt-1 text-xs ${soft}`}>VAT included</p>

      <div className={`my-5 border-y-2 ${rule} py-3`}>
        <p className={`text-lg font-bold ${strong}`}>{pkg.credits.toLocaleString()} credits</p>
        <p className={`font-mono text-xs ${soft}`}>{formatEurExact(ppc)} per minute of AI transcription</p>
      </div>

      <p className={`text-sm mb-6 flex-1 ${soft}`}>{pkg.audience}</p>
    </>
  )
}

function ProminentCard({
  pkg,
  index,
  cta,
  selection,
}: {
  pkg: PricingPackage
  index: number
  cta?: ReactNode
  selection?: Selection
}) {
  const count = PACKAGES.filter((p) => p.prominent).length
  const cell = `relative p-6 flex flex-col h-full transition-colors ${cellRule(index, count)}`
  if (selection) {
    const selected = selection.selectedId === pkg.id
    return (
      <label
        className={`${cell} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:-outline-offset-4 focus-within:outline-[var(--fg-strong)] ${
          selected ? AMBER : "bg-[var(--bg)] hover:bg-[var(--bg-subtle)]"
        }`}
      >
        <input
          type="radio"
          name="billing-plan"
          className="sr-only"
          checked={selected}
          onChange={() => selection.onSelect(pkg.id)}
        />
        <CardInner pkg={pkg} amber={selected} />
      </label>
    )
  }
  return (
    <div className={`${cell} ${pkg.mostPopular ? AMBER : "bg-[var(--bg)]"}`}>
      <CardInner pkg={pkg} amber={pkg.mostPopular} />
      {cta}
    </div>
  )
}
