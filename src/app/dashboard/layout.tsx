import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileTabBar } from "@/components/dashboard/MobileTabBar"
import { createClient } from "@/utils/supabase/server"
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

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .single()

  if (profile?.suspended) {
    redirect("/suspended")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="p-4 border-b bg-bg flex items-center gap-4">
          <SidebarTrigger />
        </div>
        {/* pb-[3.5rem] on mobile to avoid content hiding behind MobileTabBar */}
        <div className="p-4 md:p-8 bg-bg min-h-[calc(100vh-65px)] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          {children}
        </div>
      </main>
      <MobileTabBar />
    </SidebarProvider>
  )
}
