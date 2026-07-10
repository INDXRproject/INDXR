// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"
import { cheapestPackage, formatEur } from "@indxr/shared/lib/pricing"

export function PricingTeaserBlock() {
  return (
    <div className="w-full py-12 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg font-medium text-[var(--fg)] mb-2">
          Pay only for what you use. Credits never expire.
        </p>
        <p className="text-[var(--fg-subtle)] mb-6">
          Starting at {formatEur(cheapestPackage().priceEur)} — no subscription.
        </p>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] hover:underline underline-offset-2"
        >
          See pricing →
        </Link>
      </div>
    </div>
  )
}
