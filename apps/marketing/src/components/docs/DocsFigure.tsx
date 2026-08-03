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
 * natural aspect ratio — UI screenshots must never be cropped.
 *
 * Theme-aware: each capture is shot twice by the capture machine (see screenshot-machine.md)
 * as `<name>-light.png` and `<name>-dark.png`. Callers keep passing the plain `<name>.png`
 * src; this component derives both variants and swaps them purely via CSS on the active
 * [data-theme] — no JavaScript, no load flash (both are in the DOM from first paint, CSS
 * decides which shows). The PNG already carries its own framed background (fixed-width frame,
 * padding, theme background — the capture standard), so this component draws NO border of its
 * own; a border here would double the frame.
 *
 * Rule: a figure only earns its place when it shows what prose can't — a rendered output or a
 * UI state. Never decorative. Caption states what it demonstrates.
 */
export function DocsFigure({ src, alt, caption }: DocsFigureProps) {
  if (!src) return null

  const base = src.replace(/\.png$/i, "")
  const hasVariants = base !== src
  const lightSrc = hasVariants ? `${base}-light.png` : src
  const darkSrc = hasVariants ? `${base}-dark.png` : src

  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightSrc} alt={alt} loading="lazy" className="block w-full h-auto dark:hidden" />
      {/* Dark variant: aria-hidden + empty alt so the same image isn't announced twice. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={darkSrc} alt="" aria-hidden="true" loading="lazy" className="hidden w-full h-auto dark:block" />
      <figcaption className="mt-2 text-sm text-[var(--fg-muted)]">{caption}</figcaption>
    </figure>
  )
}
