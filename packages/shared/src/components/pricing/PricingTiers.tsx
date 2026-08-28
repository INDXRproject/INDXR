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
  const base = compact
    ? "px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer disabled:opacity-60"
    : "w-full py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
  return featured
    ? `${base} bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)]`
    : `${base} border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]`
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

export function PricingTiers({ renderCta, selection, footerSlot }: PricingTiersProps) {
  const prominent = PACKAGES.filter((p) => p.prominent)
  const secondary = PACKAGES.filter((p) => !p.prominent)

  return (
    <div>
      {/* 3 prominente kaarten (Starter / Plus★ / Power) */}
      {selection ? (
        <div
          role="radiogroup"
          aria-label={selection.groupLabel ?? "Choose a credit package"}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start"
        >
          {prominent.map((pkg) => (
            <ProminentCard key={pkg.id} pkg={pkg} selection={selection} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
          {prominent.map((pkg) => (
            <ProminentCard key={pkg.id} pkg={pkg} cta={renderCta?.(pkg)} />
          ))}
        </div>
      )}

      {/* Secundaire strip (Try) — bewust niet als gelijkwaardige vierde kaart (ADR-058), maar in
          select mode wél selecteerbaar zodat alle vier pakketten hetzelfde koop-pad delen. */}
      {secondary.length > 0 && (
        <div className="mt-8 max-w-md mx-auto">
          <p className="text-center text-xs text-[var(--fg-muted)] mb-3">
            Just want to try it on a single project first?
          </p>
          {secondary.map((pkg) => {
            const info = (
              <>
                <img src={pkg.image} alt="" aria-hidden className="h-12 w-12 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-[var(--fg)]">
                    {pkg.name} · {formatEur(pkg.priceEur)}
                  </h4>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {pkg.credits.toLocaleString()} credits — {pkg.audience}
                  </p>
                </div>
              </>
            )
            if (selection) {
              const selected = selection.selectedId === pkg.id
              return (
                <label
                  key={pkg.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--accent)] ${
                    selected
                      ? `border-[var(--accent)] ring-1 ring-[var(--accent)] ${TINT}`
                      : "border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--accent)]"
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
              <div
                key={pkg.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex items-center gap-4"
              >
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

// Very-light accent wash (not a saturated fill) — the recommended / selected tint in both themes.
const TINT = "bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))]"
const WRAP = "relative rounded-xl border p-6 flex flex-col h-full transition-colors"

function stateClasses(pkg: PricingPackage, selectMode: boolean, selected: boolean): string {
  const isPlus = pkg.mostPopular
  if (selectMode) {
    if (selected) {
      return `border-[var(--accent)] ring-1 ring-[var(--accent)] ${TINT} shadow-sm ${isPlus ? "sm:-translate-y-2" : ""}`
    }
    // Plus keeps its permanent accent border (+ raised position) even when not selected.
    return isPlus
      ? "border-[var(--accent)] bg-[var(--surface)] hover:border-[var(--accent)] sm:-translate-y-2"
      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
  }
  // cta mode (pricing): all three cards get the accent hover; Plus is permanently recommended.
  return isPlus
    ? `border-[var(--accent)] ring-1 ring-[var(--accent)] ${TINT} shadow-md sm:-translate-y-2 hover:border-[var(--accent)]`
    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
}

function CardInner({ pkg }: { pkg: PricingPackage }) {
  const ppc = pricePerCredit(pkg)
  return (
    <>
      {/* Fixed illustration tile: identical size + vertical position across all three cards,
          object-contain so nothing distorts. Neutral (no hexagon behind) — the coins are already
          colourful cartoon illustrations (a deliberate style, not normalised to the article
          photography), and a pattern behind them would compete; neutral is calmest in both themes. */}
      <div className="h-28 flex items-center justify-center mb-4">
        <img src={pkg.image} alt="" aria-hidden className="h-24 w-24 object-contain" />
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-semibold text-[var(--fg)] mb-1">{pkg.name}</h3>
        <div className="flex items-baseline gap-1 mb-0.5">
          <span className="text-4xl font-bold text-[var(--fg)]">{formatEur(pkg.priceEur)}</span>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">VAT included</p>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-base font-medium text-[var(--accent)]">{pkg.credits.toLocaleString()} credits</p>
        <p className="text-xs text-[var(--fg-muted)]">{formatEurExact(ppc)}/credit · {formatEurExact(ppc)}/min AI transcription</p>
      </div>

      <p className="text-sm text-[var(--fg-subtle)] mb-6 flex-1">{pkg.audience}</p>
    </>
  )
}

function Badge() {
  // `mostPopular` = interne vlag voor Plus; badge toont "Recommended" (ADR-058).
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
      <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--fg-on-accent)]">
        Recommended
      </span>
    </div>
  )
}

function ProminentCard({
  pkg,
  cta,
  selection,
}: {
  pkg: PricingPackage
  cta?: ReactNode
  selection?: Selection
}) {
  if (selection) {
    const selected = selection.selectedId === pkg.id
    return (
      <label
        className={`${WRAP} ${stateClasses(pkg, true, selected)} cursor-pointer focus-within:ring-2 focus-within:ring-[var(--accent)]`}
      >
        <input
          type="radio"
          name="billing-plan"
          className="sr-only"
          checked={selected}
          onChange={() => selection.onSelect(pkg.id)}
        />
        {pkg.mostPopular && <Badge />}
        <CardInner pkg={pkg} />
      </label>
    )
  }
  return (
    <div className={`${WRAP} ${stateClasses(pkg, false, false)}`}>
      {pkg.mostPopular && <Badge />}
      <CardInner pkg={pkg} />
      {cta}
    </div>
  )
}
