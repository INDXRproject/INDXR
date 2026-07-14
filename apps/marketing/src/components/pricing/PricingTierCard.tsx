// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

import { PricingPackage, formatEur, pricePerCredit, costInTier } from "@indxr/shared/lib/pricing"
import { BuyButton } from "@/components/pricing/BuyButton"

interface PricingTierCardProps {
  pkg: PricingPackage
}

export function PricingTierCard({ pkg }: PricingTierCardProps) {
  const ppc = pricePerCredit(pkg)
  const hourCost = costInTier(60, pkg)

  // `mostPopular` is de interne vlag voor de aanbevolen/center-stage tier (Plus). De badge
  // toont bewust "Recommended" i.p.v. "Most popular" — een eerlijke, verifieerbare claim (ADR-058).
  const card = (
    <div className={`relative rounded-xl border p-6 flex flex-col h-full ${
      pkg.mostPopular
        ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-1 ring-[var(--accent)] sm:-translate-y-2"
        : "border-[var(--border)] bg-[var(--surface)]"
    }`}>
      {pkg.mostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--fg-on-accent)]">
            Recommended
          </span>
        </div>
      )}

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

      <BuyButton pkg={pkg} featured={pkg.mostPopular} />
    </div>
  )

  return card
}
