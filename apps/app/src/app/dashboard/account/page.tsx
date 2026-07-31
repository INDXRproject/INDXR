import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettingsCard } from "@/components/dashboard/settings/ProfileSettingsCard"
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
    .select("username, role")
    .eq("id", user.id)
    .single()

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

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <PageHeader
        compact
        eyebrow="Dashboard"
        title="Account"
        lead="Manage your profile, storage, and account. Your balance and history live in Credits."
      />

      <div className="space-y-8">
        {/* Identity → storage → support. Money (balance, purchases, transactions) lives in Credits. */}
        <ProfileSettingsCard user={user} profile={profile} />
        <StorageMeterCard libraryBytes={libraryBytes} capBytes={capBytes} />
        <SentryFeedbackCard userId={user.id} email={user.email} />
      </div>
    </div>
  )
}
