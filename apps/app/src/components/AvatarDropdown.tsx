"use client"

import { User, Settings, LogOut } from "lucide-react"
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
          <UserAvatar className="h-9 w-9 text-sm" />
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
