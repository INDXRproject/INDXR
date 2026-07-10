// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Renders the non-prominent tier(s) (currently Try) as compact secondary cards
// under the prominent tiers.

import { PACKAGES, formatEur } from "@indxr/shared/lib/pricing"
import { BuyButton } from "@/components/pricing/BuyButton"

export function SecondaryTierStrip() {
  const secondaryPackages = PACKAGES.filter((p) => !p.prominent)

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-stretch justify-center gap-4 max-w-2xl mx-auto">
      {secondaryPackages.map((pkg) => (
        <div
          key={pkg.id}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3"
        >
          <div>
            <h4 className="font-semibold text-[var(--fg)]">{pkg.name}</h4>
            <p className="text-2xl font-bold text-[var(--fg)]">{formatEur(pkg.priceEur)}</p>
            <p className="text-sm text-[var(--fg-muted)]">{pkg.credits.toLocaleString()} credits</p>
          </div>
          <p className="text-xs text-[var(--fg-subtle)] flex-1">{pkg.audience}</p>
          <BuyButton pkg={pkg} />
        </div>
      ))}
    </div>
  )
}
