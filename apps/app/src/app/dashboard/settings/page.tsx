import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"
import { SecuritySettingsCard } from "@/components/dashboard/settings/SecuritySettingsCard"
import { DeveloperExportsCard } from "@/components/dashboard/settings/DeveloperExportsCard"
import { EmailNotificationsToggle } from "@/components/dashboard/settings/EmailNotificationsToggle"
import { MarketingOptOutToggle } from "@/components/dashboard/settings/MarketingOptOutToggle"
import { LibraryPageSizeSelect } from "@/components/dashboard/settings/LibraryPageSizeSelect"
import { ThemeToggle } from "@indxr/shared/components/ui/theme-toggle"

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/login`)

  const { data: profile } = await supabase
    .from("profiles")
    .select("rag_chunk_size, email_notifications, library_page_size, marketing_unsubscribed")
    .eq("id", user.id)
    .single()

  const chunkSize = (profile?.rag_chunk_size ?? 60) as 30 | 60 | 120
  const emailNotifications = profile?.email_notifications ?? true
  const libraryPageSize = (profile?.library_page_size ?? 50) as 25 | 50 | 100
  const marketingSubscribed = !(profile?.marketing_unsubscribed ?? false)

  return (
    <div className="container max-w-2xl py-10 px-4 sm:px-6 mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg mb-2">Settings</h1>
        <p className="text-fg-muted">Manage your security preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Security */}
        <SecuritySettingsCard />

        {/* Preferences */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <div>
            <h2 className="text-fg font-semibold mb-1">Preferences</h2>
            <p className="text-fg-muted text-sm">Custom themes coming soon.</p>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-fg">Theme</p>
              <p className="text-xs text-fg-muted">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-fg">Email me about replies and messages</p>
              <p className="text-xs text-fg-muted">Receive an email when you get a reply on a support ticket</p>
            </div>
            <EmailNotificationsToggle initialValue={emailNotifications} />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-fg">Marketing &amp; product emails</p>
              <p className="text-xs text-fg-muted">Receive occasional emails about new features and updates</p>
            </div>
            <MarketingOptOutToggle initialValue={marketingSubscribed} />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-fg">Library page size</p>
              <p className="text-xs text-fg-muted">Transcripts shown per page in your Library</p>
            </div>
            <LibraryPageSizeSelect initialValue={libraryPageSize} />
          </div>
        </div>

        {/* Developer Exports */}
        <DeveloperExportsCard initialChunkSize={chunkSize} />
      </div>
    </div>
  )
}
