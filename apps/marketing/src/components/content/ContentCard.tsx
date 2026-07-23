import Link from "next/link"
import type { ReactNode } from "react"

// One card, one object. Used for both the article cards (media = editorial photo) and the
// docs cards (media = seeded hexagon tile), so the two grids share ratio, radius, border,
// hover and spacing — the same component, no abstraction layer. A defined surface (raised off
// the page background) with a 1px border reads as a single element in both themes; the media
// is clipped to the top corners by the card's rounded overflow. Hover moves the border and the
// title to the accent colour on a short transition — no scale, no shadow outside the system.
export function ContentCard({
  href,
  title,
  description,
  media,
}: {
  href: string
  title: string
  description?: string
  media: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]"
    >
      {media}
      <div className="p-4">
        <span className="block text-sm font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
          {title}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-snug text-[var(--fg-muted)]">{description}</span>
        )}
      </div>
    </Link>
  )
}
