"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { PricingPackage } from "@indxr/shared/lib/pricing"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { pricingCtaClassName } from "@indxr/shared/components/pricing/PricingTiers"

interface BuyButtonProps {
  pkg: PricingPackage
  featured?: boolean
  compact?: boolean
  className?: string
}

/**
 * Marketing-oppervlak koopknop. De checkout-route bestaat alléén op de app-host
 * (app.indxr.ai) en de Supabase auth-cookie (SameSite=Lax) reist niet mee op een
 * cross-origin fetch — daarom NAVIGEREN we (top-level) naar de app-billing-pagina
 * met een auto-checkout-param, in beide auth-states:
 *  - ingelogd  → direct naar app-billing (cookie is .indxr.ai-breed gedeeld) → Stripe opent.
 *  - uitgelogd → login?next=<app-billing-url> → na auth land je daar → Stripe opent.
 * Zo werkt de knop in élke state en blijft de checkout-POST same-origin op de app.
 */
export function BuyButton({ pkg, featured = false, compact = false, className }: BuyButtonProps) {
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  const handlePurchase = async () => {
    setRedirecting(true)
    const target = appHref(`/dashboard/billing?checkout=${pkg.id}`)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Behoud de signup/login-funnel, maar land ná auth op app-billing met het pakket.
      router.push(`/login?next=${encodeURIComponent(target)}`)
      return
    }
    window.location.href = target
  }

  return (
    <button
      onClick={handlePurchase}
      disabled={redirecting}
      className={`${pricingCtaClassName(featured, compact)} ${className ?? ""}`}
    >
      {redirecting ? "Redirecting…" : `Buy ${pkg.name}`}
    </button>
  )
}
