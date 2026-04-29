import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b bg-bg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
          <span className="font-semibold text-sm mr-4 text-fg-muted">
            Admin
          </span>
          <Link
            href="/admin"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors"
          >
            Users
          </Link>
          <Link
            href="/admin/credits"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors"
          >
            Credits
          </Link>
          <Link
            href="/admin/transcripts"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors"
          >
            Transcripts
          </Link>
          <Link
            href="/admin/paid-users"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors"
          >
            Paid Users
          </Link>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-sm rounded-md hover:bg-surface-elevated transition-colors text-fg-muted"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  )
}
