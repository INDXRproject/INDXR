import { SidebarProvider } from "@indxr/shared/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/AppTopbar"
import { MobileTabBar } from "@/components/dashboard/MobileTabBar"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'

  if (!user) {
    redirect(`${MARKETING_URL}/login`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .single()

  if (profile?.suspended) {
    redirect(`${MARKETING_URL}/suspended`)
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-svh w-full">
        <AppTopbar />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar is desktop-only — on mobile navigation is the bottom tab bar */}
          <div className="hidden md:flex shrink-0">
            <AppSidebar />
          </div>
          <main id="main-content" className="flex-1 overflow-y-auto">
            {/* pb-[3.5rem] on mobile to avoid content hiding behind MobileTabBar */}
            <div className="p-4 md:p-8 bg-bg pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
              {children}
            </div>
          </main>
        </div>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  )
}
