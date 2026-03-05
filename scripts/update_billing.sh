cat << 'INNER_EOF' > /home/aladdin/Documents/Antigravity/INDXR.AI\ V2/src/app/dashboard/billing/page.tsx
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

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get user profile including plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single()

  // Get credits usage and balance
  const { data: creditsData } = await supabase.rpc("get_user_credits", { p_user_id: user.id }).single()
  
  // Use a less restrictive type to avoid TS errors
  const credits = creditsData
    ? ((creditsData as any).total_credits_purchased || 0) + ((creditsData as any).credits_bonus || 0) - ((creditsData as any).total_credits_used || 0)
    : 0

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-col items-start gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and credits.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Credits Card */}
        <Card className="bg-zinc-950/50 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Credits Balance</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your available credits for transcription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold font-mono text-foreground">{credits}</span>
                <span className="text-sm text-muted-foreground font-medium mb-1">credits</span>
              </div>
              <Button className="w-fit" variant="secondary">Buy Credits</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className="bg-zinc-950/50 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription className="text-muted-foreground">
              You are currently on the <span className="font-semibold text-foreground capitalize">{profile?.plan || 'Free'}</span> plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-fit">Upgrade Plan</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
INNER_EOF
