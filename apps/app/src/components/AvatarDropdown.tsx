"use client"

import { User, Settings, LogOut, BookOpen, Newspaper, Shield, Scale } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { UserAvatar } from "@indxr/shared/components/UserAvatar"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

export function AvatarDropdown() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = marketingHref("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 p-0 hover:ring-2 hover:ring-border transition-all border-none bg-transparent"
        >
          <UserAvatar className="h-7 w-7 text-sm" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a href="/dashboard/account" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Account
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Cross-host to the marketing site (docs/articles/legal live there); new tab keeps the
            app session open. */}
        <DropdownMenuItem asChild>
          <a href={marketingHref("/docs")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
            <BookOpen className="h-4 w-4" />
            Docs
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={marketingHref("/articles")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
            <Newspaper className="h-4 w-4" />
            Articles
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={marketingHref("/privacy")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
            <Shield className="h-4 w-4" />
            Privacy
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={marketingHref("/terms")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
            <Scale className="h-4 w-4" />
            Terms
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-error focus:text-error focus:bg-error-subtle"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
