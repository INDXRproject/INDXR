import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettingsCard } from "@/components/dashboard/settings/ProfileSettingsCard"
import { TransactionHistoryCard } from "@/components/dashboard/settings/TransactionHistoryCard"
import { PurchaseHistoryCard, PurchaseRow } from "@/components/dashboard/billing/PurchaseHistoryCard"
import { SentryFeedbackCard } from "@/components/dashboard/settings/SentryFeedbackCard"
import { StorageMeterCard } from "@/components/dashboard/StorageMeterCard"
import { PageHeader } from "@indxr/shared/components/PageHeader"

export default async function AccountPage() {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/login`)

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

  // Real library footprint + the user's effective cap from the DB (RLS: own row). The limit is
  // per-user (base 100 MiB + any purchased bonus), enforced before reservation — see StorageMeterCard.
  const { data: ucRow } = await supabase
    .from("user_credits")
    .select("library_bytes, library_bytes_cap, library_bytes_bonus")
    .eq("user_id", user.id)
    .single()
  const uc = ucRow as { library_bytes?: number; library_bytes_cap?: number; library_bytes_bonus?: number } | null
  const libraryBytes = uc?.library_bytes ?? 0
  const capBytes = (uc?.library_bytes_cap ?? 104857600) + (uc?.library_bytes_bonus ?? 0)

  // Fetch transaction history (volledige credit-ledger)
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Betaalhistorie: 'credit'-transacties met een Stripe-session in metadata (facturen).
  const { data: purchaseRows } = await supabase
    .from("credit_transactions")
    .select("id, amount, created_at, metadata")
    .eq("user_id", user.id)
    .eq("type", "credit")
    .not("metadata->>stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
  const purchases = (purchaseRows as PurchaseRow[] | null) ?? []

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <PageHeader
        compact
        eyebrow="Dashboard"
        title="Account"
        lead="Manage your profile and view your transaction history."
      />

      <div className="space-y-8">
        {/* Identity → money (credit activity, then payments) → storage → support. */}
        <ProfileSettingsCard user={user} profile={profile} />
        <TransactionHistoryCard transactions={transactions || []} credits={credits} />
        <PurchaseHistoryCard purchases={purchases} />
        <StorageMeterCard libraryBytes={libraryBytes} capBytes={capBytes} />
        <SentryFeedbackCard userId={user.id} email={user.email} />
      </div>
    </div>
  )
}
