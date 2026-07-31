import { redirect } from "next/navigation"

import { PageHeader } from "@indxr/shared/components/PageHeader"
import { SectionLabel } from "@indxr/shared/components/SectionLabel"
import { HexagonCreditIcon } from "@indxr/shared/components/icons/HexagonCreditIcon"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { BillingPurchaseGrid } from "@/components/dashboard/billing/BillingPurchaseGrid"
import { PurchaseHistoryCard, PurchaseRow } from "@/components/dashboard/billing/PurchaseHistoryCard"
import { TransactionHistoryCard } from "@/components/dashboard/settings/TransactionHistoryCard"

// The money hub: balance, packages, and the full credit + purchase history — everything about
// credits in one place. Account keeps identity/security/storage (ADR-084).
export default async function CreditsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/login`)
  }

  const { data: creditsData } = await supabase.rpc("get_user_credits", { p_user_id: user.id }).single()
  const parsedCredits = creditsData as { credits?: number }
  const credits = parsedCredits?.credits || 0

  // Full credit ledger (deductions, refunds, grants, purchases).
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Purchases: 'credit'-transacties met een Stripe-session in metadata (met factuurknop).
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
        title="Credits"
        lead="Your balance, top-ups, and history. Pay as you go — no subscriptions, no hidden fees."
      />

      {/* Balance */}
      <section className="mb-12">
        <SectionLabel label="Credits balance" />
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-6 py-5">
          <HexagonCreditIcon className="size-9 shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-fg tabular-nums">{credits}</span>
            <span className="text-sm text-fg-subtle font-medium">credits available</span>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="mb-12">
        <SectionLabel label="Buy credits" />
        <p className="text-sm text-fg-muted -mt-2 mb-5">
          Pick a package, then confirm below. Credits never expire.
        </p>
        <BillingPurchaseGrid />
      </section>

      {/* Credit activity (full ledger) */}
      <section className="mb-12">
        <SectionLabel label="Credit activity" />
        <TransactionHistoryCard transactions={transactions || []} credits={credits} />
      </section>

      {/* Payments + invoices */}
      <section>
        <SectionLabel label="Payment history" />
        <PurchaseHistoryCard purchases={purchases} />
      </section>
    </div>
  )
}
