import type { ReactNode } from "react"

/**
 * Docs code block: horizontally scrollable with a visible scrollbar, never overflowing the
 * viewport. Same mobile degradation rule as DocsTable — content scrolls inside its own box.
 */
export function DocsCodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="my-6 overflow-x-auto border-2 border-[var(--fg-strong)] bg-[var(--bg-subtle)] p-4 text-sm [scrollbar-width:thin]">
      <code className="font-mono text-[var(--fg-subtle)]">{children}</code>
    </pre>
  )
}
