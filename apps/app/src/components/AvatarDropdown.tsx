"use client"

import { User, Settings, LogOut, BookOpen, Newspaper, Shield, Scale, Coins } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@indxr/shared/components/ui/sheet"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { UserAvatar } from "@indxr/shared/components/UserAvatar"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

// Account menu — a right-slide Sheet (ADR-079). On mobile the bottom tab bar is the primary
// nav, so Account / Settings / Sign out live behind the avatar here; on desktop it doubles as
// the account menu (the sidebar carries the same items). 44px rows throughout.
const rowClass =
  "flex items-center gap-3 min-h-[44px] px-3 rounded-lg text-sm text-fg hover:bg-surface-elevated transition-colors"

export function AvatarDropdown() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = marketingHref("/login")
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 p-0 hover:ring-2 hover:ring-border transition-all border-none bg-transparent"
        >
          <UserAvatar className="h-7 w-7 text-sm" />
          <span className="sr-only">Account menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] gap-1 p-4">
        <SheetTitle className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Account
        </SheetTitle>

        <SheetClose asChild>
          <a href="/dashboard/account" className={rowClass}>
            <User className="h-4 w-4" /> Account
          </a>
        </SheetClose>
        <SheetClose asChild>
          <a href="/dashboard/credits" className={rowClass}>
            <Coins className="h-4 w-4" /> Credits
          </a>
        </SheetClose>
        <SheetClose asChild>
          <a href="/dashboard/settings" className={rowClass}>
            <Settings className="h-4 w-4" /> Settings
          </a>
        </SheetClose>

        <div className="my-2 border-t border-border" />

        {/* Docs/articles/legal live on the marketing host; new tab keeps the app session open. */}
        <SheetClose asChild>
          <a href={marketingHref("/docs")} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <BookOpen className="h-4 w-4" /> Docs
          </a>
        </SheetClose>
        <SheetClose asChild>
          <a href={marketingHref("/articles")} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <Newspaper className="h-4 w-4" /> Articles
          </a>
        </SheetClose>
        <SheetClose asChild>
          <a href={marketingHref("/privacy")} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <Shield className="h-4 w-4" /> Privacy
          </a>
        </SheetClose>
        <SheetClose asChild>
          <a href={marketingHref("/terms")} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <Scale className="h-4 w-4" /> Terms
          </a>
        </SheetClose>

        <div className="my-2 border-t border-border" />

        <SheetClose asChild>
          <button
            onClick={handleSignOut}
            className={`${rowClass} w-full text-left text-error hover:bg-error-subtle`}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
