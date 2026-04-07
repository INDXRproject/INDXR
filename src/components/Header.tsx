"use client"

import Link from "next/link"
import { Menu, User, Settings, LogOut, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { CreditBalance } from "@/components/CreditBalance"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/utils/supabase/client"
import { UserAvatar } from "@/components/UserAvatar"
import { useRouter } from "next/navigation"

function AvatarDropdown() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 p-0 hover:ring-2 hover:ring-white/20 transition-all border-none bg-transparent"
        >
          <UserAvatar className="h-9 w-9 text-sm" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/account" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur supports-backdrop-filter:bg-[var(--bg-base)]/60">
      <div className="container flex h-16 items-center px-4 mx-auto">

        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo className="size-8 text-[var(--accent)]" />
          <span className="text-xl font-semibold text-[var(--text-primary)]">INDXR.AI</span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          <Link href="/youtube-transcript-generator" className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
            Transcript Generator
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
            Pricing
          </Link>
          <Link href="/faq" className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
            FAQ
          </Link>
        </nav>

        {/* Right-side controls */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <CreditBalance />
              <AvatarDropdown />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-8">
                {user && (
                  <div className="pb-4 border-b border-[var(--border)]">
                    <CreditBalance />
                  </div>
                )}
                <nav className="flex flex-col gap-4">
                  <SheetClose asChild>
                    <Link href="/youtube-transcript-generator" className="text-lg font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
                      Transcript Generator
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/pricing" className="text-lg font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
                      Pricing
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/faq" className="text-lg font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">
                      FAQ
                    </Link>
                  </SheetClose>
                </nav>
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <Link href="/dashboard/account" className="w-full">
                          <Button variant="outline" className="w-full">Account</Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <MobileSignOutButton />
                      </SheetClose>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link href="/login" className="w-full">
                          <Button variant="outline" className="w-full">Log In</Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/signup" className="w-full">
                          <Button className="w-full">Sign Up</Button>
                        </Link>
                      </SheetClose>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function MobileSignOutButton() {
  const router = useRouter()
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }
  return (
    <Button
      variant="ghost"
      className="w-full text-red-500 hover:text-red-400 hover:bg-red-950/20"
      onClick={handleSignOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  )
}
