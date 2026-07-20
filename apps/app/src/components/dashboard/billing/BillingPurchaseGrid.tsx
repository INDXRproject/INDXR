"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { PricingTiers, pricingCtaClassName } from "@indxr/shared/components/pricing/PricingTiers"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import { VALID_PLAN_IDS } from "@indxr/shared/lib/pricing"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

export function BillingPurchaseGrid() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const autoStarted = useRef(false)

  const handlePurchase = async (plan: string) => {
    // Legal gate: must accept the Terms + Privacy Policy before any purchase can start.
    if (!accepted) {
      setPendingPlan(plan)
      return
    }
    setCheckoutError(null)
    try {
      setLoadingPlan(plan)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, termsAccepted: true }),
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

  // Arriving from the marketing buy-button (app.indxr.ai/dashboard/billing?checkout=<plan>): remember
  // the intended plan and prompt for consent — do NOT auto-redirect to payment, since the Terms must
  // be accepted first. Once the box is ticked, the user clicks Buy.
  useEffect(() => {
    if (autoStarted.current) return
    const plan = searchParams.get('checkout')
    if (plan && VALID_PLAN_IDS.has(plan)) {
      autoStarted.current = true
      setPendingPlan(plan)
    }
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

      <label className="flex items-start gap-2.5 text-sm text-[var(--fg-muted)]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          aria-describedby="terms-consent-text"
        />
        <span id="terms-consent-text">
          I agree to the{" "}
          <a
            href={marketingHref("/terms")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={marketingHref("/privacy")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {pendingPlan && !accepted && (
        <p className="text-sm text-[var(--warning)]">
          Please accept the Terms of Service and Privacy Policy to continue your purchase.
        </p>
      )}

      <PricingTiers
        renderCta={(pkg, opts) => (
          <button
            onClick={() => handlePurchase(pkg.id)}
            disabled={!accepted || loadingPlan === pkg.id}
            title={!accepted ? "Accept the Terms of Service and Privacy Policy first" : undefined}
            className={pricingCtaClassName(pkg.mostPopular, opts?.compact)}
          >
            {loadingPlan === pkg.id ? 'Redirecting…' : `Buy ${pkg.name}`}
          </button>
        )}
      />
    </div>
  )
}
