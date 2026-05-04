import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettingsCard } from "@/components/dashboard/settings/ProfileSettingsCard"
import { TransactionHistoryCard } from "@/components/dashboard/settings/TransactionHistoryCard"
import { SentryFeedbackCard } from "@/components/dashboard/settings/SentryFeedbackCard"

export default async function AccountPage() {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, avatar_color")
    .eq("id", user.id)
    .single()

  // Fetch credits
  const { data: creditsData } = await supabase
    .rpc("get_user_credits", { p_user_id: user.id })
    .single()
  const parsedCredits = creditsData as { credits?: number }
  const credits = parsedCredits?.credits || 0

  // Fetch transaction history
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="container max-w-4xl py-10 px-4 sm:px-6 mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg mb-2">Account</h1>
        <p className="text-fg-muted">Manage your profile and view your transaction history.</p>
      </div>

      <div className="space-y-8">
        <ProfileSettingsCard user={user} profile={profile} />
        <TransactionHistoryCard transactions={transactions || []} credits={credits} />
        <SentryFeedbackCard userId={user.id} email={user.email} />
      </div>
    </div>
  )
}
