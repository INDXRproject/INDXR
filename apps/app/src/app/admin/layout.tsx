import Link from "next/link"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"
import { ThemeToggle } from "@indxr/shared/components/ui/theme-toggle"
import { Logo } from "@indxr/shared/components/ui/logo"
import { AvatarDropdown } from "@/components/AvatarDropdown"
import { AdminNav } from "./AdminNav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b bg-bg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">
          <Link href="/admin" className="flex items-center gap-1.5 shrink-0 text-fg" aria-label="INDXR admin">
            <Logo className="size-6 text-accent" />
            <span className="font-semibold text-sm text-fg-muted">Admin</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Link
              href="/dashboard"
              className="whitespace-nowrap px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors text-fg-muted"
            >
              ← Back to App
            </Link>
            <ThemeToggle />
            <AvatarDropdown />
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  )
}
