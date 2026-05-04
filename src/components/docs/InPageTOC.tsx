// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages
"use client"

import { useEffect, useState } from "react"

interface TOCItem {
  id: string
  label: string
  level: 2 | 3
}

interface InPageTOCProps {
  items: TOCItem[]
}

export function InPageTOC({ items }: InPageTOCProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: "-20% 0% -70% 0%" }
    )
    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav className="hidden xl:block sticky top-8 w-48 shrink-0 text-sm" aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">On this page</p>
      <ul className="space-y-1.5">
        {items.map(({ id, label, level }) => (
          <li key={id} style={{ paddingLeft: level === 3 ? "0.75rem" : "0" }}>
            <a
              href={`#${id}`}
              className={`block transition-colors ${
                activeId === id
                  ? "text-[var(--accent)] font-medium"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
