// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages
"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"

interface AnchorHeadingProps {
  id: string
  level?: 2 | 3
  children: React.ReactNode
}

export function AnchorHeading({ id, level = 2, children }: AnchorHeadingProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const className = "group flex items-center gap-2 font-semibold text-[var(--fg)] scroll-mt-20"

  const content = (
    <>
      {children}
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--fg-muted)] hover:text-[var(--accent)]"
        aria-label="Copy link to section"
      >
        <Link2 className="h-4 w-4" />
      </button>
      {copied && <span className="text-xs text-[var(--fg-muted)]">Copied!</span>}
    </>
  )

  if (level === 2) return <h2 id={id} className={`${className} text-xl mt-8 mb-4`}>{content}</h2>
  return <h3 id={id} className={`${className} text-lg mt-6 mb-3`}>{content}</h3>
}
