"use client"

import { useState } from "react"
import { PricingCard } from "@/components/ui/pricing-card"
import { Footer } from "@/components/Footer"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Gift, Clock, CreditCard } from "lucide-react"

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
    <>
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="container py-24 px-4 sm:px-6 lg:px-8 mx-auto">

        {/* Header */}
        <div className="text-center mb-12 max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)]">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
            Pay once, use credits as you need. No subscriptions, no hidden fees.
          </p>
        </div>

        {/* Callout badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Credits never expire — use them at your own pace</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
            <Gift className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">25 free credits when you sign up</span>
          </div>
        </div>

        {/* Pricing cards grid - 5 tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto items-start">

          <PricingCard
            name="Try"
            price="€2.49"
            credits={200}
            label="Try it out"
            description="Perfect for trying out the platform."
            ctaLabel={loadingPlan === 'try' ? 'Redirecting...' : 'Buy Now'}
            features={[
              "200 transcript credits",
              "~3h AI transcription or 200 playlist videos",
              "All export formats",
            ]}
            onSelect={() => handlePurchase('try')}
          />

          <PricingCard
            name="Basic"
            price="€5.99"
            credits={500}
            description="Great for regular users."
            ctaLabel={loadingPlan === 'basic' ? 'Redirecting...' : 'Buy Now'}
            features={[
              "500 transcript credits",
              "~8h AI transcription or 500 playlist videos",
              "All export formats",
              "Email support",
            ]}
            onSelect={() => handlePurchase('basic')}
          />

          <PricingCard
            name="Plus"
            price="€11.99"
            credits={1100}
            label="Most Popular"
            featured={true}
            description="Best value for creators and researchers."
            ctaLabel={loadingPlan === 'plus' ? 'Redirecting...' : 'Buy Now'}
            features={[
              "1,100 transcript credits",
              "~18h AI transcription or 1,100 playlist videos",
              "All export formats",
              "Priority processing",
              "Batch playlist extraction",
            ]}
            onSelect={() => handlePurchase('plus')}
          />

          <PricingCard
            name="Pro"
            price="€24.99"
            credits={2600}
            description="For heavy users and teams."
            ctaLabel={loadingPlan === 'pro' ? 'Redirecting...' : 'Buy Now'}
            features={[
              "2,600 transcript credits",
              "~43h AI transcription or 2,600 playlist videos",
              "All export formats",
              "Priority support",
              "Batch processing",
            ]}
            onSelect={() => handlePurchase('pro')}
          />

          <PricingCard
            name="Power"
            price="€49.99"
            credits={5500}
            label="Best Value"
            description="Maximum value for archiving."
            ctaLabel={loadingPlan === 'power' ? 'Redirecting...' : 'Buy Now'}
            features={[
              "5,500 transcript credits",
              "~91h AI transcription or 5,500 playlist videos",
              "All export formats",
              "Priority support",
              "API access (Beta)",
            ]}
            onSelect={() => handlePurchase('power')}
          />
        </div>

        {/* Comparison row */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-[var(--text-primary)]">INDXR.AI</h3>
              </div>
              <p className="text-[var(--text-muted)]">Pay only what you use. Credits never expire.</p>
            </div>
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-[var(--text-muted)]">Subscription tools</h3>
              </div>
              <p className="text-[var(--text-muted)]">Pay monthly. Unused minutes lost forever.</p>
            </div>
          </div>
        </div>

        {/* FAQ section */}
        <div className="mt-24 max-w-3xl mx-auto border-t pt-16 border-[var(--border)]">
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
              <p className="text-[var(--text-muted)]">1 credit = 1 minute of AI transcription. A 1-hour video uses 60 credits. Caption extraction is always free.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">Can I get a refund?</h3>
              <p className="text-[var(--text-muted)]">We offer refunds within 7 days if you haven&apos;t used more than 5 credits.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}
