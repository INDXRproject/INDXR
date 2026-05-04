// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Renders the 3 prominent tiers (Basic / Plus / Pro) in a responsive grid.

import { PACKAGES } from "@/lib/pricing"
import { PricingTierCard } from "@/components/pricing/PricingTierCard"

export function PricingTierGrid() {
  const prominentPackages = PACKAGES.filter((p) => p.prominent)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
      {prominentPackages.map((pkg) => (
        <PricingTierCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  )
}
