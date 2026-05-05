// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Client island: handles Stripe checkout call for a single tier.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { PricingPackage } from "@indxr/shared/lib/pricing"

interface BuyButtonProps {
  pkg: PricingPackage
  featured?: boolean
  className?: string
}

export function BuyButton({ pkg, featured = false, className }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePurchase = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Please log in to purchase credits")
      router.push(`/login?next=/pricing`)
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: pkg.id }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || "Failed to create checkout session")
      }

      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An error occurred during checkout."
      toast.error(msg)
      setLoading(false)
    }
  }

  const base = "w-full py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-60"
  const variant = featured
    ? `${base} bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)]`
    : `${base} border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]`

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className={`${variant} ${className ?? ""}`}
    >
      {loading ? "Redirecting…" : `Buy ${pkg.name}`}
    </button>
  )
}
