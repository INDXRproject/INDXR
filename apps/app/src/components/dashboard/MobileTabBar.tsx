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

// Stijl B (2026-11-07): own glyphs, not stock icons — 2px ink strokes, square caps and mitred
// corners, like the rules and boxes elsewhere in the app. 20×20, currentColor.
function Glyph({ name }: { name: Tab["label"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const, "aria-hidden": true }
  switch (name) {
    case "Home":
      return <svg {...common}><path d="M3 9.5 10 3l7 6.5V17H3z" /><path d="M8 17v-5h4v5" /></svg>
    case "Transcribe":
      return <svg {...common}><path d="M3 8v4M7 5v10M11 7v6M15 4v12" /><path d="M18 9v2" /></svg>
    case "Library":
      return <svg {...common}><path d="M2.5 3h3v14h-3zM8.5 3h3v14h-3z" /><path d="m14 4.4 2.5-.7 2.7 12.4-2.5.7z" /></svg>
    default:
      return <svg {...common}><path d="M3 3h14v10H9l-4 4v-4H3z" /><path d="M6.5 7h7M6.5 10h4" /></svg>
  }
}

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
                "flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors border-r-2 border-border-strong last:border-r-0",
                // Stijl B (2026-11-07): active tab = amber block with ink, like the desktop sidebar.
                active
                  ? "bg-accent text-fg-on-accent font-bold"
                  : "text-fg-strong hover:bg-bg-subtle"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Glyph name={tab.label} />
                {tab.label === "Messages" && messagesUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 border-2 border-fg-strong bg-accent text-fg-on-accent font-mono text-[10px] font-bold flex items-center justify-center leading-none">
                    {messagesUnread > 9 ? "9+" : messagesUnread}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
