// Shared pricing presentation — one design for BOTH surfaces (marketing /pricing
// en app /dashboard/billing). Driven volledig door `prominent` / `mostPopular` uit
// pricing.ts (single source of truth). De ACTIE verschilt per oppervlak (marketing
// = auth-aware navigatie, app = directe checkout-fetch) en wordt als `renderCta`-prop
// ingebracht — zo delen we de kaarten zonder de knop-logica te koppelen.
//
// Universeel component (GEEN "use client"): rendert server-side op marketing (SSR/SEO
// blijft intact — alleen de CTA is een client-island) én client-side op de app.

import type { ReactNode } from "react"
import { PricingPackage, PACKAGES, formatEur, pricePerCredit, costInTier } from "../../lib/pricing"

/**
 * Gedeelde CTA-knop-chroom zodat beide oppervlakken visueel identieke knoppen
 * renderen (geen design-drift). Alleen de klik-actie verschilt per surface.
 */
export function pricingCtaClassName(featured?: boolean, compact?: boolean): string {
  const base = compact
    ? "px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer disabled:opacity-60"
    : "w-full py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
  return featured
    ? `${base} bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)]`
    : `${base} border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]`
}

interface PricingTiersProps {
  // Retourneert de CTA voor één pakket. `compact` = true voor de secundaire Try-strip.
  renderCta: (pkg: PricingPackage, opts?: { compact?: boolean }) => ReactNode
}

export function PricingTiers({ renderCta }: PricingTiersProps) {
  const prominent = PACKAGES.filter((p) => p.prominent)
  const secondary = PACKAGES.filter((p) => !p.prominent)

  return (
    <div>
      {/* 3 prominente kaarten (Starter / Plus★ / Power) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
        {prominent.map((pkg) => (
          <ProminentCard key={pkg.id} pkg={pkg} cta={renderCta(pkg)} />
        ))}
      </div>

      {/* Secundaire strip (Try) — bewust niet als gelijkwaardige vierde kaart (ADR-058) */}
      {secondary.length > 0 && (
        <div className="mt-8 max-w-md mx-auto">
          <p className="text-center text-xs text-[var(--fg-muted)] mb-3">
            Just want to try it on a single project first?
          </p>
          {secondary.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex items-center gap-4"
            >
              <img src={pkg.image} alt="" aria-hidden className="h-12 w-12 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[var(--fg)]">
                  {pkg.name} · {formatEur(pkg.priceEur)}
                </h4>
                <p className="text-xs text-[var(--fg-muted)]">
                  {pkg.credits.toLocaleString()} credits — {pkg.audience}
                </p>
              </div>
              <div className="shrink-0">{renderCta(pkg, { compact: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProminentCard({ pkg, cta }: { pkg: PricingPackage; cta: ReactNode }) {
  const ppc = pricePerCredit(pkg)
  const hourCost = costInTier(60, pkg)

  return (
    <div
      className={`relative rounded-xl border p-6 flex flex-col h-full ${
        pkg.mostPopular
          ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-1 ring-[var(--accent)] sm:-translate-y-2"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      {/* `mostPopular` = interne vlag voor Plus; badge toont "Recommended" (ADR-058). */}
      {pkg.mostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--fg-on-accent)]">
            Recommended
          </span>
        </div>
      )}

      <img src={pkg.image} alt="" aria-hidden className="h-24 w-24 mx-auto mb-4 object-contain" />

      <div className="mb-4">
        <h3 className="text-xl font-semibold text-[var(--fg)] mb-1">{pkg.name}</h3>
        <div className="flex items-baseline gap-1 mb-0.5">
          <span className="text-4xl font-bold text-[var(--fg)]">{formatEur(pkg.priceEur)}</span>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">VAT included</p>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-base font-medium text-[var(--accent)]">{pkg.credits.toLocaleString()} credits</p>
        <p className="text-xs text-[var(--fg-muted)]">{formatEur(ppc)}/credit · {formatEur(ppc)}/min AI transcription</p>
        <p className="text-xs text-[var(--fg-muted)] italic">1-hour AI transcription = 60 credits ({formatEur(hourCost)})</p>
      </div>

      <p className="text-sm text-[var(--fg-subtle)] mb-6 flex-1">{pkg.audience}</p>

      {cta}
    </div>
  )
}
