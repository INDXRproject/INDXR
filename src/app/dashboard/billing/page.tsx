import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { BillingPurchaseGrid } from "@/components/dashboard/billing/BillingPurchaseGrid"
import Link from "next/link"

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get credits usage and balance securely
  const { data: creditsData } = await supabase.rpc("get_user_credits", { p_user_id: user.id }).single()
  const parsedCredits = creditsData as { credits?: number }
  const credits = parsedCredits?.credits || 0

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-col items-start gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing</h1>
        <p className="text-muted-foreground">Manage your credits and purchase top-ups.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Credits Card */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl rounded-full bg-[var(--accent)]/50 w-32 h-32 -mr-10 -mt-10" />
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Credits Balance</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Your available credits for transcription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold tracking-tighter text-[var(--text-primary)]">{credits}</span>
                <span className="text-lg text-[var(--text-secondary)] font-medium mb-1">credits</span>
              </div>
              <Button 
                className="w-fit bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-150 ease-out font-semibold"
                asChild
              >
                <Link href="#packages">Buy Credits</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12" id="packages">
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Credit Packages</h2>
        <p className="text-muted-foreground">Pay as you go. No subscriptions, no hidden fees.</p>
        
        <BillingPurchaseGrid />
      </div>

    </div>
  )
}
