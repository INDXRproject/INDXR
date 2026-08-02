import type { ReactNode } from "react"

interface DocsFigureProps {
  /** Image path under /public. Omit and the figure renders nothing (no visitor-facing
      placeholder box) until a real screenshot lands. */
  src?: string
  /** REQUIRED. Screen-reader description of the image content. */
  alt: string
  /** REQUIRED. Says what the figure demonstrates, not what it is. */
  caption: ReactNode
  /** Deprecated/unused: figures now render at the screenshot's natural aspect (no crop). */
  aspect?: string
}

/**
 * A figure slot with a REQUIRED caption and alt text. When `src` is absent it renders
 * nothing (no visitor-facing empty box). When present it shows the screenshot at its
 * natural aspect ratio inside a bordered frame — UI screenshots must never be cropped.
 * Rule: a figure only earns its place when it shows what prose can't — a rendered
 * output or a UI state. Never decorative. Caption states what it demonstrates.
 */
export function DocsFigure({ src, alt, caption }: DocsFigureProps) {
  if (!src) return null

  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)]"
      />
      <figcaption className="mt-2 text-sm text-[var(--fg-muted)]">{caption}</figcaption>
    </figure>
  )
}
