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
      className="group block h-full overflow-hidden border-2 border-[var(--fg-strong)] bg-[var(--bg)] transition-colors hover:bg-[var(--bg-subtle)]"
    >
      {media}
      <div className="border-t-2 border-[var(--fg-strong)] p-4">
        <span className="block text-base font-bold text-[var(--fg-strong)] underline-offset-4 group-hover:underline">
          {title}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-snug text-[var(--fg-muted)]">{description}</span>
        )}
      </div>
    </Link>
  )
}
