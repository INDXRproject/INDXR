import { SidebarProvider } from "@indxr/shared/components/ui/sidebar"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/AppTopbar"
import { MobileTabBar } from "@/components/dashboard/MobileTabBar"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"

// Logged-in users have no marketing footer; these give them a path to docs/articles/legal
// (all on the marketing host, so they open in a new tab). Shown on every dashboard page.
const APP_FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/articles", label: "Articles" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
]

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
            <div className="relative min-h-full p-4 md:p-8 bg-bg pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
              {/* Shared honeycomb texture behind every dashboard page (same as /articles, Library). */}
              <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
              <div className="relative">
                {children}
                <footer className="mt-12 pt-6 border-t border-border/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                  {APP_FOOTER_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={marketingHref(l.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-fg transition-colors"
                    >
                      {l.label}
                    </a>
                  ))}
                </footer>
              </div>
            </div>
          </main>
        </div>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  )
}
