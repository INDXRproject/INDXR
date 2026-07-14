// Renders the non-prominent tier(s) (currently Try) as a smaller, clearly-secondary
// intro option UNDER the three main cards — for people who want to test the waters first.
// Deliberately not presented as an equal fourth card (ADR-058: Try = de-risk intro).

import { PACKAGES, formatEur } from "@indxr/shared/lib/pricing"
import { BuyButton } from "@/components/pricing/BuyButton"

export function SecondaryTierStrip() {
  const secondaryPackages = PACKAGES.filter((p) => !p.prominent)

  return (
    <div className="mt-8 max-w-md mx-auto">
      <p className="text-center text-xs text-[var(--fg-muted)] mb-3">
        Just want to try it on a single project first?
      </p>
      {secondaryPackages.map((pkg) => (
        <div
          key={pkg.id}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--fg)]">
              {pkg.name} · {formatEur(pkg.priceEur)}
            </h4>
            <p className="text-xs text-[var(--fg-muted)]">
              {pkg.credits.toLocaleString()} credits — {pkg.audience}
            </p>
          </div>
          <div className="shrink-0">
            <BuyButton pkg={pkg} className="!w-auto px-4 py-2 text-xs" />
          </div>
        </div>
      ))}
    </div>
  )
}
