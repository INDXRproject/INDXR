"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { ThemeToggle } from "@indxr/shared/components/ui/theme-toggle"
import { Button } from "@indxr/shared/components/ui/button"
import { HexagonCreditIcon } from "@indxr/shared/components/icons/HexagonCreditIcon"
import { useAuth } from "@indxr/shared/hooks/useAuth"
import { useUnreadMessages } from "../hooks/useUnreadMessages"
import { AvatarDropdown } from "./AvatarDropdown"

export function AppTopbar() {
  const { credits } = useAuth()
  const hasUnreadMessages = useUnreadMessages()

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

      {/* On mobile, navigation is the bottom tab bar only — no sidebar, so no trigger here. */}

      <div className="flex-1" />

      {/* Right-side controls: ThemeToggle → Messages → Credits → Avatar */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <a href="/dashboard/messages" className="relative">
            <Mail className="h-[1.35rem] w-[1.35rem]" />
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />
            )}
            <span className="sr-only">Messages</span>
          </a>
        </Button>

        {/* Credits — coin + count grouped as one element */}
        <a
          href="/dashboard/billing"
          className="flex items-center gap-1.5 h-9 pl-1.5 pr-2.5 rounded-full border border-border bg-surface-elevated text-fg hover:border-border-strong transition-colors"
          aria-label={`${credits ?? 0} credits`}
        >
          <HexagonCreditIcon className="size-5" />
          <span className="text-sm font-medium tabular-nums">{credits ?? 0}</span>
        </a>

        <AvatarDropdown />
      </div>
    </header>
  )
}
