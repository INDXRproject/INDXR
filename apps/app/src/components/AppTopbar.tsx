"use client"

import Link from "next/link"
import { Mail, CircleDollarSign } from "lucide-react"
import { SidebarTrigger } from "@indxr/shared/components/ui/sidebar"
import { ThemeToggle } from "@indxr/shared/components/ui/theme-toggle"
import { Button } from "@indxr/shared/components/ui/button"
import { useAuth } from "@indxr/shared/hooks/useAuth"
import { AvatarDropdown } from "./AvatarDropdown"

export function AppTopbar() {
  const { credits } = useAuth()

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-bg flex items-center px-4 gap-3 shrink-0">
      {/* Logo — links to dashboard home */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <img
          src="/logo/indxr-mark-black-transparent.png"
          alt=""
          className="dark:hidden"
          style={{ height: "32px", width: "auto" }}
        />
        <img
          src="/logo/indxr-mark-white-transparent.png"
          alt=""
          className="hidden dark:block"
          style={{ height: "32px", width: "auto" }}
        />
        <img
          src="/logo/indxr-wordmark-black-transparent.png"
          alt="INDXR.AI"
          className="dark:hidden"
          style={{ height: "36px", width: "auto" }}
        />
        <img
          src="/logo/indxr-wordmark-white-transparent.png"
          alt="INDXR.AI"
          className="hidden dark:block"
          style={{ height: "36px", width: "auto" }}
        />
      </Link>

      {/* Mobile-only: opens sidebar drawer. Desktop: sidebar toggle lives inside the sidebar itself. */}
      <SidebarTrigger className="md:hidden" />

      <div className="flex-1" />

      {/* Right-side controls: ThemeToggle → Messages → Credits → Avatar */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        <Button variant="ghost" size="icon" asChild>
          <a href="/dashboard/messages">
            <Mail className="h-5 w-5" />
            <span className="sr-only">Messages</span>
          </a>
        </Button>

        <a
          href="/dashboard/billing"
          className="flex items-center gap-1.5 px-2 h-9 rounded-md text-sm text-fg-subtle hover:text-fg hover:bg-surface-elevated transition-colors"
        >
          <CircleDollarSign className="size-5 text-accent shrink-0" />
          <span className="bg-surface-elevated text-fg-muted px-1.5 py-0.5 rounded text-xs font-medium tabular-nums">
            {credits ?? 0}
          </span>
        </a>

        <AvatarDropdown />
      </div>
    </header>
  )
}
