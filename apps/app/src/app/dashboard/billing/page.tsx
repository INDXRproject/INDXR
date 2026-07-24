import { redirect } from "next/navigation"

import { PageHeader } from "@indxr/shared/components/PageHeader"
import { SectionLabel } from "@indxr/shared/components/SectionLabel"
import { HexagonCreditIcon } from "@indxr/shared/components/icons/HexagonCreditIcon"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { BillingPurchaseGrid } from "@/components/dashboard/billing/BillingPurchaseGrid"
import { PurchaseHistoryCard, PurchaseRow } from "@/components/dashboard/billing/PurchaseHistoryCard"

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/login`)
  }

  // Get credits usage and balance securely
  const { data: creditsData } = await supabase.rpc("get_user_credits", { p_user_id: user.id }).single()
  const parsedCredits = creditsData as { credits?: number }
  const credits = parsedCredits?.credits || 0

  // Aankoophistorie: 'credit'-transacties met een Stripe-session in metadata.
  const { data: purchaseRows } = await supabase
    .from("credit_transactions")
    .select("id, amount, created_at, metadata")
    .eq("user_id", user.id)
    .eq("type", "credit")
    .not("metadata->>stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
  const purchases = (purchaseRows as PurchaseRow[] | null) ?? []

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col">
        <PageHeader
          compact
          eyebrow="Account"
          title="Billing"
          lead="Manage your credits and buy top-ups. Pay as you go — no subscriptions, no hidden fees."
        />

        {/* Credits balance — compact row: balance prominent, button beside it (not below). */}
        <section className="mb-12">
          <SectionLabel label="Credits balance" />
          {/* Balance only — no "Buy credits" button here; the packages are right below. */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-6 py-5">
            <HexagonCreditIcon className="size-9 shrink-0" />
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold tracking-tight text-fg tabular-nums">{credits}</span>
              <span className="text-sm text-fg-subtle font-medium">credits available</span>
            </div>
          </div>
        </section>

        {/* Credit packages — select-then-buy grid. */}
        <section className="mb-12 scroll-mt-8" id="packages">
          <SectionLabel label="Credit packages" />
          <p className="text-sm text-fg-muted -mt-2 mb-5">
            Pick a package, then confirm below. Credits never expire.
          </p>
          <BillingPurchaseGrid />
        </section>

        {/* Purchase history — own section label + line, like the other sections. */}
        <section>
          <SectionLabel label="Purchase history" />
          {/* Facturen staan op /dashboard/account — hier puur het overzicht. */}
          <PurchaseHistoryCard purchases={purchases} showInvoice={false} bare />
        </section>
    </div>
  )
}
