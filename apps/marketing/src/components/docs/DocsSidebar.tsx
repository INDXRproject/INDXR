"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { docsConfig } from "@/lib/docs-config"
import { cn } from "@indxr/shared/lib/utils"

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
      {docsConfig.sections.map((section) => {
        const isOpen = openSections.has(section.label)
        const hasActivePage = section.pages.some((p) => p.href === pathname)

        return (
          <div key={section.label} className="mb-1">
            <button
              onClick={() => toggleSection(section.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 font-mono text-[11px] font-medium transition-colors cursor-pointer",
                hasActivePage
                  ? "text-[var(--fg-strong)]"
                  : "text-[var(--fg-subtle)] hover:text-[var(--fg-strong)]"
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

            {/* Always render the links in the DOM (collapsed = visually hidden, not removed) so
                AI crawlers and no-JS clients see every section's links, not just the open ones. */}
            <ul className={cn("mt-0.5 space-y-0.5", !isOpen && "hidden")}>
              {section.pages.map((page) => {
                  const isActive = pathname === page.href
                  const indentPx = (page.indent ?? 0) * 12
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        style={{ paddingLeft: `calc(0.75rem + ${indentPx}px)` }}
                        className={cn(
                          "block py-1.5 pr-3 text-sm transition-colors",
                          isActive
                            ? "bg-[var(--accent)] text-[var(--fg-on-accent)] font-bold"
                            : "text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-subtle)]"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {page.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
          </div>
        )
      })}
    </nav>
  )
}
