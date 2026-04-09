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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start mt-8">
      <PricingCard
        name="Starter"
        price="€1.99"
        credits={15}
        label="Try it out"
        description="Perfect for trying out the platform."
        ctaLabel={loadingPlan === 'starter' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "15 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
        ]}
        onSelect={() => handlePurchase('starter')}
      />

      <PricingCard
        name="Basic"
        price="€4.99"
        credits={50}
        description="Great for regular users."
        ctaLabel={loadingPlan === 'basic' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "50 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
          "Email support",
        ]}
        onSelect={() => handlePurchase('basic')}
      />

      <PricingCard
        name="Plus"
        price="€9.99"
        credits={130}
        label="Most Popular"
        featured={true}
        description="Best value for creators and researchers."
        ctaLabel={loadingPlan === 'plus' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "130 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
          "Priority processing",
          "Batch playlist extraction",
        ]}
        onSelect={() => handlePurchase('plus')}
      />

      <PricingCard
        name="Pro"
        price="€24.99"
        credits={400}
        description="For heavy users and teams."
        ctaLabel={loadingPlan === 'pro' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "400 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
          "Priority support",
          "Batch processing",
        ]}
        onSelect={() => handlePurchase('pro')}
      />

      <PricingCard
        name="Power"
        price="€49.99"
        credits={850}
        label="Best Value"
        description="Maximum value for archiving."
        ctaLabel={loadingPlan === 'power' ? 'Redirecting...' : 'Buy Now'}
        features={[
          "850 transcript credits",
          "Videos up to 4 hours",
          "All export formats",
          "Priority support",
          "API access (Beta)",
        ]}
        onSelect={() => handlePurchase('power')}
      />
    </div>
  )
}
