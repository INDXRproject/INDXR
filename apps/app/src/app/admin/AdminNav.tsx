"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS: { label: string; href: string }[] = [
  { label: "Overview", href: "/admin" },
  { label: "Finance", href: "/admin/finance" },
  { label: "Growth", href: "/admin/growth" },
  { label: "Operations", href: "/admin/operations" },
  { label: "Users", href: "/admin/users" },
  { label: "Transcripts", href: "/admin/transcripts" },
  { label: "Support", href: "/admin/support" },
  { label: "Announcements", href: "/admin/announcements" },
]

export function AdminNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {TABS.map((tab) => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-md transition-colors ${
              active
                ? "bg-accent-subtle text-accent font-medium"
                : "text-fg-muted hover:bg-surface-elevated hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
