"use client"

import { usePathname } from "next/navigation"
import { HexField } from "@/components/content/HexField"

// Per-page masthead for docs. Docs get no photography — they get a generated hexagon field,
// seeded on the pathname so each page has its own stable constellation (same path → same
// pattern). Same 16:9 ratio, radius and border as the article hero, so docs and articles
// read as one system. No image files, no extra network request.
export function DocsHexBanner() {
  const pathname = usePathname()
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] mb-8">
      <HexField seed={pathname ?? "docs"} color="var(--accent)" />
    </div>
  )
}
