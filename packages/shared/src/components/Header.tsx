"use client"

import { useState, useEffect } from "react"
import { marketingHref, appHref } from "../lib/cross-host-links"
import { Menu, User, Settings, LogOut, LayoutDashboard } from "lucide-react"
import { useAuth } from "../hooks/useAuth"
import { Button } from "./ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "./ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { createClient } from "../utils/supabase/client"
import { UserAvatar } from "./UserAvatar"
function AvatarDropdown() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = marketingHref('/login')
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
          <a href={appHref('/dashboard')} className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={appHref('/dashboard/account')} className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Account
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={appHref('/dashboard/settings')} className="flex items-center gap-2 cursor-pointer">
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

export function Header() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-colors duration-300 ${
      scrolled
        ? "border-border bg-bg/80 backdrop-blur-sm"
        : "border-transparent bg-transparent"
    }`}>
      <div className="container flex h-16 items-center px-4 mx-auto">

        {/* Logo — left */}
        <a href={marketingHref('/')} className="flex items-center shrink-0 gap-3">
          <img
            src="/logo/indxr-mark-black-transparent.png"
            alt=""
            className="dark:hidden"
            style={{ height: '40px', width: 'auto' }}
          />
          <img
            src="/logo/indxr-mark-white-transparent.png"
            alt=""
            className="hidden dark:block"
            style={{ height: '40px', width: 'auto' }}
          />
          <img
            src="/logo/indxr-wordmark-black-transparent.png"
            alt="INDXR.AI"
            className="dark:hidden"
            style={{ height: '48px', width: 'auto' }}
          />
          <img
            src="/logo/indxr-wordmark-white-transparent.png"
            alt="INDXR.AI"
            className="hidden dark:block"
            style={{ height: '48px', width: 'auto' }}
          />
        </a>

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          <a href={marketingHref('/pricing')} className="text-sm font-medium text-fg-subtle transition-colors hover:text-accent">
            Pricing
          </a>
          <a href={marketingHref('/docs')} className="text-sm font-medium text-fg-subtle transition-colors hover:text-accent">
            Docs
          </a>
          <a href={marketingHref('/articles')} className="text-sm font-medium text-fg-subtle transition-colors hover:text-accent">
            Articles
          </a>
          {/* "Try it free" is a signup nudge — hide it for a logged-in user, who already has "Go to app"
              on the right (point 8: the two shouldn't sit side by side). */}
          {!user && (
            <a href={marketingHref('/transcribe')}>
              <Button size="sm" className="bg-accent text-fg-on-accent hover:bg-accent-hover">
                Try it free
              </Button>
            </a>
          )}
        </nav>

        {/* Right-side controls */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <a href={appHref('/dashboard')}>
              <Button size="sm" className="bg-accent text-fg-on-accent hover:bg-accent-hover">
                Go to app
              </Button>
            </a>
          ) : (
            <>
              <a href={marketingHref('/login')}>
                <Button variant="ghost" size="sm">Log in</Button>
              </a>
              <a href={marketingHref('/signup')}>
                <Button size="sm">Sign up</Button>
              </a>
            </>
          )}
        </div>

        {/* Mobile Menu — full-screen sheet, 44px rows, theme toggle inside (ADR-079) */}
        <div className="flex md:hidden items-center ml-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-none p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-10 flex flex-col">
                <SheetClose asChild>
                  <a href={marketingHref('/pricing')} className="flex items-center min-h-[44px] text-lg font-medium text-fg transition-colors hover:text-accent">
                    Pricing
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href={marketingHref('/docs')} className="flex items-center min-h-[44px] text-lg font-medium text-fg transition-colors hover:text-accent">
                    Docs
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href={marketingHref('/articles')} className="flex items-center min-h-[44px] text-lg font-medium text-fg transition-colors hover:text-accent">
                    Articles
                  </a>
                </SheetClose>
              </nav>

              <div className="my-4 border-t border-border" />

              <div className="flex flex-col gap-3">
                {user ? (
                  <>
                    <SheetClose asChild>
                      <a href={appHref('/dashboard')} className="w-full">
                        <Button className="w-full bg-accent text-fg-on-accent min-h-[44px]">Go to app</Button>
                      </a>
                    </SheetClose>
                    <SheetClose asChild>
                      <MobileSignOutButton />
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <a href={marketingHref('/login')} className="flex items-center min-h-[44px] text-lg font-medium text-fg transition-colors hover:text-accent">
                        Log in
                      </a>
                    </SheetClose>
                    <SheetClose asChild>
                      <a href={marketingHref('/signup')} className="w-full">
                        <Button className="w-full min-h-[44px]">Sign up</Button>
                      </a>
                    </SheetClose>
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-fg-muted">Theme</span>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function MobileSignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = marketingHref('/login')
  }
  return (
    <Button
      variant="ghost"
      className="w-full text-error hover:text-error-fg hover:bg-error-subtle"
      onClick={handleSignOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  )
}
