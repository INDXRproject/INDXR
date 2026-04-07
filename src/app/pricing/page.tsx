"use client"

import { useState } from "react"
import { PricingCard } from "@/components/ui/pricing-card"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handlePurchase = async (plan: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        toast.error("Please log in to purchase credits")
        router.push('/login?next=/pricing')
        return
    }

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
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="container py-24 px-4 sm:px-6 lg:px-8 mx-auto">
        
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)]">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
            Pay once, use credits as you need. No subscriptions, no hidden fees. Your credits never expire.
          </p>
        </div>
        
        {/* Pricing cards grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto items-start">
          
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
        
        {/* FAQ section (Placeholder) */}
        <div className="mt-32 max-w-3xl mx-auto border-t pt-16 border-[var(--border)]">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-6">
              <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-[var(--text-primary)]">Do my credits expire?</h3>
                  <p className="text-[var(--text-muted)]">No, your credits never expire. You can use them whenever you need.</p>
              </div>
              <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-[var(--text-primary)]">How are credits calculated?</h3>
                  <p className="text-[var(--text-muted)]">1 credit = 1 video transcript (any duration up to 4 hours). Simple as that.</p>
              </div>
               <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-[var(--text-primary)]">Can I get a refund?</h3>
                  <p className="text-[var(--text-muted)]">We offer refunds within 7 days if you haven't used more than 5 credits.</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
