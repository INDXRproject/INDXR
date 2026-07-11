"use client"

import { useState } from "react"
import { PricingCard } from "@indxr/shared/components/ui/pricing-card"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import { PACKAGES, formatEur, CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// Tier-onafhankelijke capabilities (gelden voor alle betaalde tiers). Geen
// verzonnen per-tier perks — credits/prijzen/tarieven komen dynamisch uit pricing.ts.
const PLAYLIST_RATE = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const FEATURES = [
  `AI transcription (${CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit/min)`,
  `Playlist & batch processing (first ${FREE_TIER.PLAYLIST_FREE_VIDEOS} free, then ${PLAYLIST_RATE} credit${PLAYLIST_RATE === 1 ? "" : "s"}/video)`,
  "RAG-ready JSON export for vector DBs",
  "Free existing-caption extraction",
  "All export formats · credits never expire",
]

export function BillingPurchaseGrid() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handlePurchase = async (plan: string) => {
    setCheckoutError(null)
    try {
      setLoadingPlan(plan)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to create checkout session')
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      const msg = error instanceof Error ? error.message : "An error occurred during checkout."
      setCheckoutError(msg)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-4">
      {checkoutError && (
        <FeedbackCard
          variant="error"
          message={checkoutError}
          onDismiss={() => setCheckoutError(null)}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start mt-8">
        {PACKAGES.map((pkg) => (
          <PricingCard
            key={pkg.id}
            name={pkg.name}
            price={formatEur(pkg.priceEur)}
            credits={pkg.credits}
            label={pkg.mostPopular ? "Most Popular" : undefined}
            featured={pkg.mostPopular}
            description={pkg.description}
            ctaLabel={loadingPlan === pkg.id ? 'Redirecting...' : 'Buy Now'}
            features={FEATURES}
            onSelect={() => handlePurchase(pkg.id)}
          />
        ))}
      </div>
    </div>
  )
}
