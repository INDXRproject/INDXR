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
    <div className="flex flex-col h-svh">
      <AppTopbar />
      <SidebarProvider className="flex-1 overflow-hidden">
        <AppSidebar />
        <main id="main-content" className="w-full overflow-y-auto">
          {/* pb-[3.5rem] on mobile to avoid content hiding behind MobileTabBar */}
          <div className="p-4 md:p-8 bg-bg pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
            {children}
          </div>
        </main>
        <MobileTabBar />
      </SidebarProvider>
    </div>
  )
}
