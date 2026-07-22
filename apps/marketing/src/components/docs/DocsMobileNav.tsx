"use client"

import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@indxr/shared/components/ui/sheet"
import { DocsSidebar } from "./DocsSidebar"

/**
 * Mobile docs navigation: a menu-icon trigger that opens the full docs sidebar in a left
 * drawer. On mobile the persistent left sidebar is hidden, so this is the only way in.
 */
export function DocsMobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          aria-label="Open documentation navigation"
        >
          <Menu className="h-4 w-4" />
          Docs navigation
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <SheetTitle className="text-sm font-semibold text-[var(--fg)]">Documentation</SheetTitle>
        </div>
        <div className="py-4">
          <DocsSidebar />
        </div>
      </SheetContent>
    </Sheet>
  )
}
