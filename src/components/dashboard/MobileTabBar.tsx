"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, AudioLines, Library, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

// TODO: Account + Settings via avatar-tap rechtsboven → drawer slide van rechts (Claude Design fase)

interface Tab {
  href: string
  label: string
  icon: React.ElementType
  matchPrefix?: string
}

const TABS: Tab[] = [
  { href: "/dashboard",            label: "Home",      icon: Home,       matchPrefix: undefined },
  { href: "/dashboard/transcribe", label: "Transcribe", icon: AudioLines  },
  { href: "/dashboard/library",    label: "Library",   icon: Library,    matchPrefix: "/dashboard/library" },
  { href: "/dashboard/messages",   label: "Messages",  icon: Inbox       },
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
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--surface)] border-t border-[var(--border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex h-14">
        {TABS.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                active
                  ? "text-[var(--accent)] border-t-2 border-[var(--accent)]"
                  : "text-[var(--fg-muted)] border-t-2 border-transparent hover:text-[var(--fg)]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.label === "Messages" && messagesUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[var(--accent)] text-[var(--fg-on-accent)] text-[10px] font-medium flex items-center justify-center leading-none">
                    {messagesUnread > 9 ? "9+" : messagesUnread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
