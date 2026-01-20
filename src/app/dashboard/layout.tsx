import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
         <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-950">
            <SidebarTrigger />
            <div className="font-semibold text-white">Dashboard</div>
         </div>
         <div className="p-4 md:p-8 bg-black min-h-[calc(100vh-65px)]">
            {children}
         </div>
      </main>
    </SidebarProvider>
  )
}
