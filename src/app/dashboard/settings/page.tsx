import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SecuritySettingsCard } from "@/components/dashboard/settings/SecuritySettingsCard"
import { DeveloperExportsCard } from "@/components/dashboard/settings/DeveloperExportsCard"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("rag_chunk_size")
    .eq("id", user.id)
    .single()

  const chunkSize = (profile?.rag_chunk_size ?? 60) as 30 | 60 | 120

  return (
    <div className="container max-w-2xl py-10 px-4 sm:px-6 mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your security preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Security */}
        <SecuritySettingsCard />

        {/* Preferences */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-4">
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold mb-1">Preferences</h2>
            <p className="text-[var(--text-muted)] text-sm">Custom themes coming soon.</p>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-[var(--border)]/50">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-muted)]">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Developer Exports */}
        <DeveloperExportsCard initialChunkSize={chunkSize} />
      </div>
    </div>
  )
}
