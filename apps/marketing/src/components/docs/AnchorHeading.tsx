"use client"

import { useState } from "react"
import { Link as LinkIcon, Check } from "lucide-react"

// Slugify a heading's text into a stable anchor id.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface AnchorHeadingProps {
  as?: "h2" | "h3"
  children: string
  id?: string
}

/**
 * Reference-doc H2/H3 with a click-to-copy anchor link. Every heading is directly
 * linkable (AI-citation + support links). `scroll-mt` clears the fixed marketing header
 * so an anchored heading isn't hidden under it.
 */
export function AnchorHeading({ as = "h2", children, id }: AnchorHeadingProps) {
  const anchorId = id ?? slugify(children)
  const [copied, setCopied] = useState(false)
  const Tag = as

  const handleCopy = () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}${window.location.pathname}#${anchorId}`
    navigator.clipboard?.writeText(url).catch(() => {})
    window.history.replaceState(null, "", `#${anchorId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const sizeClass =
    as === "h2"
      ? "text-xl font-semibold mt-10 mb-3"
      : "text-base font-semibold mt-6 mb-2"

  return (
    <Tag id={anchorId} className={`group scroll-mt-24 text-[var(--fg)] ${sizeClass}`}>
      <a
        href={`#${anchorId}`}
        onClick={handleCopy}
        className="inline-flex items-center gap-2 no-underline hover:text-[var(--accent)] transition-colors"
      >
        <span>{children}</span>
        <span
          aria-hidden
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--fg-muted)]"
          title="Copy link to this section"
        >
          {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        </span>
      </a>
    </Tag>
  )
}
