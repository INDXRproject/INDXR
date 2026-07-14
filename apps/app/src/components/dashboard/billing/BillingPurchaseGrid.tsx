"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { PricingTiers, pricingCtaClassName } from "@indxr/shared/components/pricing/PricingTiers"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import { VALID_PLAN_IDS } from "@indxr/shared/lib/pricing"

export function BillingPurchaseGrid() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const autoStarted = useRef(false)

  const handlePurchase = async (plan: string) => {
    setCheckoutError(null)
    try {
      setLoadingPlan(plan)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Auto-checkout wanneer we hier landen vanaf de marketing-koopknop
  // (app.indxr.ai/dashboard/billing?checkout=<plan>). Eén keer, alleen voor een geldig plan.
  useEffect(() => {
    if (autoStarted.current) return
    const plan = searchParams.get('checkout')
    if (plan && VALID_PLAN_IDS.has(plan)) {
      autoStarted.current = true
      handlePurchase(plan)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="space-y-4 mt-8">
      {checkoutError && (
        <FeedbackCard
          variant="error"
          message={checkoutError}
          onDismiss={() => setCheckoutError(null)}
        />
      )}
      <PricingTiers
        renderCta={(pkg, opts) => (
          <button
            onClick={() => handlePurchase(pkg.id)}
            disabled={loadingPlan === pkg.id}
            className={pricingCtaClassName(pkg.mostPopular, opts?.compact)}
          >
            {loadingPlan === pkg.id ? 'Redirecting…' : `Buy ${pkg.name}`}
          </button>
        )}
      />
    </div>
  )
}
