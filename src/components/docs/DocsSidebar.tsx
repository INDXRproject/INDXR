"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import { docsConfig } from "@/lib/docs-config"
import { cn } from "@/lib/utils"

export function DocsSidebar() {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const open = new Set<string>()
    for (const section of docsConfig.sections) {
      if (section.pages.some((p) => p.href === pathname)) {
        open.add(section.label)
      }
    }
    // Always open Getting started by default
    open.add("Getting started")
    return open
  })

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Documentation navigation">
      {/* Search placeholder — not functional yet */}
      <div className="px-3 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-muted)]" />
          <input
            type="search"
            placeholder="Search docs…"
            disabled
            className="w-full h-8 pl-8 pr-3 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg-muted)] placeholder:text-[var(--fg-muted)] cursor-not-allowed opacity-60"
            aria-label="Search documentation (coming soon)"
          />
        </div>
      </div>

      {docsConfig.sections.map((section) => {
        const isOpen = openSections.has(section.label)
        const hasActivePage = section.pages.some((p) => p.href === pathname)

        return (
          <div key={section.label} className="mb-1">
            <button
              onClick={() => toggleSection(section.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer",
                hasActivePage
                  ? "text-[var(--fg)]"
                  : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
              )}
              aria-expanded={isOpen}
            >
              <span className="uppercase tracking-wide">{section.label}</span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-150",
                  isOpen && "rotate-90"
                )}
              />
            </button>

            {isOpen && (
              <ul className="mt-0.5 space-y-0.5">
                {section.pages.map((page) => {
                  const isActive = pathname === page.href
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-[var(--radius-sm)] transition-colors",
                          isActive
                            ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
                            : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {page.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
