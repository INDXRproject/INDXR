"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@indxr/shared/lib/utils"

// TODO: Account + Settings via avatar-tap rechtsboven → drawer slide van rechts (Claude Design fase)

interface Tab {
  href: string
  label: string
  matchPrefix?: string
}

const TABS: Tab[] = [
  { href: "/dashboard",            label: "Home" },
  { href: "/dashboard/transcribe", label: "Transcribe" },
  { href: "/dashboard/library",    label: "Library",   matchPrefix: "/dashboard/library" },
  { href: "/dashboard/messages",   label: "Messages" },
]

interface MobileTabBarProps {
  messagesUnread?: number
}

export function MobileTabBar({ messagesUnread = 0 }: MobileTabBarProps) {
  const pathname = usePathname()

  const isActive = (tab: Tab) => {
    if (tab.matchPrefix) return pathname.startsWith(tab.matchPrefix)
    return pathname === tab.href
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg border-t-2 border-border-strong"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex h-[var(--tabbar-h)]">
        {TABS.map((tab) => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex items-center justify-center relative transition-colors border-r-2 border-border-strong last:border-r-0",
                // Stijl B (2026-11-07): active tab = amber block with ink, like the desktop sidebar.
                active
                  ? "bg-accent text-fg-on-accent font-bold"
                  : "text-fg-strong hover:bg-bg-subtle"
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Stijl B (2026-11-07): words, no stock icons — four tabs fit as plain labels. */}
              <span className="text-[13px] font-bold leading-none tracking-[-0.01em]">{tab.label}</span>
              {tab.label === "Messages" && messagesUnread > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 border-2 border-fg-strong bg-accent text-fg-on-accent font-mono text-[10px] font-bold flex items-center justify-center leading-none">
                  {messagesUnread > 9 ? "9+" : messagesUnread}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
