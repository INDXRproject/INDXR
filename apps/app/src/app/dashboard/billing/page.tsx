import { redirect } from "next/navigation"

import { Button } from "@indxr/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@indxr/shared/components/ui/card"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { BillingPurchaseGrid } from "@/components/dashboard/billing/BillingPurchaseGrid"
import { PurchaseHistoryCard, PurchaseRow } from "@/components/dashboard/billing/PurchaseHistoryCard"
import Link from "next/link"

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
    <div className="flex max-w-4xl mx-auto w-full flex-col">
      <div className="flex flex-col items-start gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Billing</h1>
        <p className="text-fg-muted">Manage your credits and purchase top-ups.</p>
      </div>

      <div className="grid gap-6">
        {/* Credits Card */}
        <Card className="bg-surface border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl rounded-full bg-accent/50 w-32 h-32 -mr-10 -mt-10" />
          <CardHeader>
            <CardTitle className="text-fg">Credits Balance</CardTitle>
            <CardDescription className="text-fg-subtle">
              Your available credits for transcription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold tracking-tighter text-fg">{credits}</span>
                <span className="text-lg text-fg-subtle font-medium mb-1">credits</span>
              </div>
              <Button 
                className="w-fit bg-accent text-fg hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 ease-out font-semibold"
                asChild
              >
                <Link href="#packages">Buy Credits</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12" id="packages">
        <h2 className="text-2xl font-bold tracking-tight text-fg mb-2">Credit Packages</h2>
        <p className="text-fg-muted">Pay as you go. No subscriptions, no hidden fees.</p>

        <BillingPurchaseGrid />
      </div>

      <div className="mt-12">
        {/* Overzicht zonder invoice-knop — facturen staan op /dashboard/account. */}
        <PurchaseHistoryCard purchases={purchases} showInvoice={false} />
      </div>

    </div>
  )
}
