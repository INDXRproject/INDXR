import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SecuritySettingsCard } from "@/components/dashboard/settings/SecuritySettingsCard"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="container max-w-2xl py-10 px-4 sm:px-6 mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your security preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Security */}
        <SecuritySettingsCard />

        {/* Preferences */}
        <div className="rounded-lg border border-border bg-card/50 p-6 space-y-4">
          <div>
            <h2 className="text-foreground font-semibold mb-1">Preferences</h2>
            <p className="text-muted-foreground text-sm">Custom themes coming soon.</p>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
