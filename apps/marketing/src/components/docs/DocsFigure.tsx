import type { ReactNode } from "react"

interface DocsFigureProps {
  /** Image path under /public. Omit to render the reserved-space placeholder. */
  src?: string
  /** REQUIRED. Screen-reader description of the image content. */
  alt: string
  /** REQUIRED. Says what the figure demonstrates, not what it is. */
  caption: ReactNode
  /** CSS aspect-ratio for the reserved box, e.g. "16 / 9" (default) or "4 / 3". */
  aspect?: string
}

/**
 * A figure slot with a REQUIRED caption and alt text. Reserves space via a fixed
 * aspect-ratio box so the page layout does not shift when a screenshot lands later.
 * Rule: a figure only earns its place when it shows what prose can't — a rendered
 * output (CSV in a spreadsheet, Markdown in Obsidian, a RAG chunk) or a UI state.
 * Never decorative. Caption states what it demonstrates.
 */
export function DocsFigure({ src, alt, caption, aspect = "16 / 9" }: DocsFigureProps) {
  return (
    <figure className="my-6">
      <div
        className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)]"
        style={{ aspectRatio: aspect }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            role="img"
            aria-label={alt}
            className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-[var(--fg-muted)]"
          >
            Figure placeholder — {alt}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-[var(--fg-muted)]">{caption}</figcaption>
    </figure>
  )
}
