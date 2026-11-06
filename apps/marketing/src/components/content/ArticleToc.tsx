"use client"

import { useEffect, useState } from "react"

// Sticky "On this page" list for article bodies (stijl B, 2026-11-06). Reads the h2s that the
// article already renders (server HTML stays the source of truth for crawlers) and gives each a
// stable id derived from its text when it has none, so the links and #anchors work.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function ArticleToc({ bodyId }: { bodyId: string }) {
  const [items, setItems] = useState<Array<{ id: string; text: string }>>([])
  const [active, setActive] = useState<string>("")

  useEffect(() => {
    const body = document.getElementById(bodyId)
    if (!body) return
    const heads = Array.from(body.querySelectorAll("h2"))
    const used = new Set<string>()
    const list = heads.map((h) => {
      let id = h.id || slugify(h.textContent ?? "")
      while (used.has(id)) id = `${id}-x`
      used.add(id)
      h.id = id
      h.style.scrollMarginTop = "96px"
      return { id, text: h.textContent ?? "" }
    })
    setItems(list)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target.id)
        if (visible.length) setActive(visible[0])
      },
      { rootMargin: "-96px 0px -70% 0px" },
    )
    heads.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [bodyId])

  if (items.length < 2) return null
  return (
    <nav aria-label="On this page" className="border-t-2 border-[var(--fg-strong)] pt-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">On this page</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`block border-l-2 pl-3 text-sm leading-snug transition-colors ${
                active === it.id
                  ? "border-[var(--accent)] font-bold text-[var(--fg-strong)]"
                  : "border-transparent text-[var(--fg-subtle)] hover:text-[var(--fg-strong)]"
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
