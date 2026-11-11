"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "../../lib/utils"
import { parseSpellingHints, MAX_KEYTERMS } from "../../lib/spellingHints"
import { Notice } from "../ui/notice"

/**
 * Optional "+ Spelling hints" field for AI transcription only (never shown for caption
 * extraction — captions don't go through AssemblyAI). Collapsed by default (pattern: the
 * "+ Add another file" link in QuickCheckoutPanel). Up to 3 recent-list chips below the field —
 * one click fills the textarea; no naming, no management screen (deliberately kept small).
 */
export function SpellingHintsField({
  value,
  onChange,
  recentLists = [],
}: {
  value: string[]
  onChange: (terms: string[]) => void
  recentLists?: string[][]
}) {
  const [expanded, setExpanded] = useState(value.length > 0)
  const [raw, setRaw] = useState(value.join(", "))
  const [error, setError] = useState<string | undefined>()
  const fieldId = useId()

  function handleChange(next: string) {
    setRaw(next)
    const parsed = parseSpellingHints(next)
    setError(parsed.error)
    onChange(parsed.terms)
  }

  function applyRecentList(terms: string[]) {
    handleChange(terms.join(", "))
    setExpanded(true)
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-[var(--link)] hover:underline"
      >
        + Spelling hints
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={fieldId} className="text-sm font-medium text-fg-strong">
          Spelling hints
        </label>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-fg-muted hover:text-fg-strong"
          aria-label="Collapse spelling hints"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-fg-muted">
        Names and terms in this recording, so the AI spells them right. Separate with commas.
      </p>
      <textarea
        id={fieldId}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Eudaimonia, Wittgenstein, Habsburg, habeas corpus"
        rows={2}
        className={cn(
          "w-full min-w-0 rounded-md border-2 border-border-strong bg-bg px-3 py-2 text-sm",
          "placeholder:text-fg-muted shadow-xs transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-accent"
        )}
      />
      {error && <Notice tone="warning">{error}</Notice>}
      {!error && value.length > 0 && (
        <p className="text-xs text-fg-subtle">
          {value.length} / {MAX_KEYTERMS} terms
        </p>
      )}
      {recentLists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recentLists.slice(0, 3).map((terms, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyRecentList(terms)}
              className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs text-fg-muted hover:text-fg-strong hover:border-border-strong"
            >
              {terms.slice(0, 3).join(", ")}
              {terms.length > 3 ? "…" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** "Spelling hints: N" label for the transcript detail page, next to the existing method/edited badges. */
export function SpellingHintsBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="text-xs text-fg-muted">
      Spelling hints: {count}
    </span>
  )
}
