"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { PricingTiers, pricingCtaClassName } from "@indxr/shared/components/pricing/PricingTiers"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import { PACKAGES, VALID_PLAN_IDS, formatEur } from "@indxr/shared/lib/pricing"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

const DEFAULT_PLAN = "plus"

// Select-then-buy: the three prominent cards are one radio group (Plus selected by default),
// the ToS checkbox and a single buy button sit directly under the grid so it's unambiguous what
// you're agreeing to, and the button reflects the selection. Try keeps its own row + own button,
// outside the selection. Native radios give keyboard support for free (arrows move + select).
export function BillingPurchaseGrid() {
  const [selected, setSelected] = useState<string>(DEFAULT_PLAN)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const searchParams = useSearchParams()
  const autoSelected = useRef(false)

  const selectedPkg = PACKAGES.find((p) => p.id === selected) ?? PACKAGES.find((p) => p.id === DEFAULT_PLAN)!

  const checkout = async (plan: string) => {
    if (!accepted) return
    setCheckoutError(null)
    try {
      setLoadingPlan(plan)
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, termsAccepted: true }),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || "Failed to create checkout session")
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error("Checkout error:", error)
      setCheckoutError(error instanceof Error ? error.message : "An error occurred during checkout.")
      setLoadingPlan(null)
    }
  }

  // Arriving from the marketing buy-button (…/dashboard/billing?checkout=<plan>): preselect that
  // plan (if it's one of the three prominent tiers) so the buy button reflects the intent. We do
  // NOT auto-redirect — the Terms must be accepted first, so the user ticks the box and clicks Buy.
  useEffect(() => {
    if (autoSelected.current) return
    const plan = searchParams.get("checkout")
    if (plan && VALID_PLAN_IDS.has(plan) && PACKAGES.find((p) => p.id === plan)?.prominent) {
      autoSelected.current = true
      setSelected(plan)
    }
  }, [searchParams])

  const tos = (
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
        <a href={marketingHref("/terms")} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href={marketingHref("/privacy")} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
          Privacy Policy
        </a>
        .
      </span>
    </label>
  )

  return (
    <div className="mt-8">
      {checkoutError && (
        <div className="max-w-4xl mx-auto mb-4">
          <FeedbackCard variant="error" message={checkoutError} onDismiss={() => setCheckoutError(null)} />
        </div>
      )}

      <PricingTiers
        selection={{ selectedId: selected, onSelect: setSelected, groupLabel: "Choose a credit package" }}
        betweenSlot={
          <div className="max-w-4xl mx-auto mt-8 flex flex-col gap-4">
            {tos}
            <button
              onClick={() => checkout(selectedPkg.id)}
              disabled={!accepted || loadingPlan !== null}
              title={!accepted ? "Accept the Terms of Service and Privacy Policy first" : undefined}
              className="w-fit px-6 py-2.5 rounded-lg font-semibold text-sm bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer disabled:opacity-60"
            >
              {loadingPlan === selectedPkg.id ? "Redirecting…" : `Buy ${selectedPkg.name} — ${formatEur(selectedPkg.priceEur)}`}
            </button>
          </div>
        }
        renderCta={(pkg, opts) => (
          <button
            onClick={() => checkout(pkg.id)}
            disabled={!accepted || loadingPlan !== null}
            title={!accepted ? "Accept the Terms of Service and Privacy Policy first" : undefined}
            className={pricingCtaClassName(false, opts?.compact)}
          >
            {loadingPlan === pkg.id ? "Redirecting…" : `Buy ${pkg.name}`}
          </button>
        )}
      />
    </div>
  )
}
