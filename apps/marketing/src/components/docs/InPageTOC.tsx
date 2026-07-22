"use client"

import { useEffect, useState } from "react"
import { cn } from "@indxr/shared/lib/utils"

interface Heading {
  id: string
  text: string
  level: number
}

/**
 * Sticky scroll-spy "On this page" TOC (reference-doc.md spec). Fed by the AnchorHeadings
 * already rendered in the page (h2/h3 with ids under #docs-content). Renders nothing when a
 * page has fewer than 2 headings (short pages don't need a TOC). Desktop-only via the shell.
 */
export function InPageTOC() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("#docs-content h2[id], #docs-content h3[id]")
    )
    const hs: Heading[] = nodes.map((n) => ({
      id: n.id,
      text: (n.textContent || "").trim(),
      level: n.tagName === "H3" ? 3 : 2,
    }))
    setHeadings(hs)
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id)
      },
      // Activate a heading once it's near the top of the viewport, under the fixed header.
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 }
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  if (headings.length < 2) return null

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    window.history.replaceState(null, "", `#${id}`)
  }

  return (
    <nav aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">
        On this page
      </p>
      <ul className="border-l border-[var(--border)]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => handleClick(e, h.id)}
              className={cn(
                "block -ml-px border-l-2 py-1 text-sm transition-colors",
                h.level === 3 ? "pl-6" : "pl-3",
                activeId === h.id
                  ? "border-[var(--accent)] text-[var(--accent)] font-medium"
                  : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-strong)]"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
