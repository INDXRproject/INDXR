"use client"

import { useState } from "react"
import { PricingCard } from "@/components/ui/pricing-card"
import { toast } from "sonner"

export function BillingPurchaseGrid() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handlePurchase = async (plan: string) => {
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
      toast.error(msg)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start mt-8">
      <PricingCard 
        name="Starter"
        price="€4.99"
        credits={50}
        description="Perfect for casual users trying out the platform."
        ctaLabel={loadingPlan === 'starter' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "50 transcript credits",
          "Videos up to 4 hours",
          "TXT, JSON, SRT exports",
          "Email support"
        ]}
        onSelect={() => handlePurchase('starter')}
      />
      
      <PricingCard 
        name="Regular"
        price="€9.99"
        credits={120}
        description="Best value for creators and researchers."
        featured={true}
        ctaLabel={loadingPlan === 'regular' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "120 transcript credits",
          "Videos up to 4 hours",
          "All export formats (VTT, CSV)",
          "Priority processing",
          "Batch playlist extraction"
        ]}
        onSelect={() => handlePurchase('regular')}
      />
      
      <PricingCard 
        name="Power"
        price="€24.99"
        credits={350}
        description="For heavy users and archiving."
        ctaLabel={loadingPlan === 'power' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "350 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
          "Priority support",
          "Batch processing queries",
          "API access (Beta)"
        ]}
        onSelect={() => handlePurchase('power')}
      />
    </div>
  )
}
