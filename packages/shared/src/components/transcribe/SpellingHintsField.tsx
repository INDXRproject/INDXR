"use client"

import { useId, useState } from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"
import { validateTerm, suggestTermsFromTitle, splitSpellingTerms, MAX_KEYTERMS } from "../../lib/spellingHints"
import { Button } from "../ui/button"
import { Notice } from "../ui/notice"

/**
 * Optional spelling-hints row for AI transcription only (never shown for caption extraction —
 * captions don't go through AssemblyAI). A full row in the cost block (mono label + "Optional ·
 * no extra cost"), collapsed to one explanation line + an "Add names & terms" button by default,
 * expanding to pill-entry + title-derived suggestion chips + recent-lists chips.
 */
export function SpellingHintsField({
  value,
  onChange,
  recentLists = [],
  suggestTitle,
  suggestChannel,
}: {
  value: string[]
  onChange: (terms: string[]) => void
  recentLists?: string[][]
  /** Video title/channel, used only to derive deterministic "From the title" suggestion chips. */
  suggestTitle?: string | null
  suggestChannel?: string | null
}) {
  const [expanded, setExpanded] = useState(value.length > 0)
  const [draft, setDraft] = useState("")
  const [skipMessage, setSkipMessage] = useState<string | undefined>()
  const fieldId = useId()

  const suggestions = suggestTermsFromTitle(suggestTitle, suggestChannel).filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  )

  // Handles both a single typed term (Enter/",") and a pasted multi-term blob — splitSpellingTerms
  // breaks on comma/Arabic comma/semicolon/full-width comma/newline, so "الموطأ، الإمام مالك، ابن
  // عبد البر" or a pasted "Zubaidah\nBarmakids\nKhurasan; Raqqa" each become several candidate
  // terms instead of one (live test 2026-11-12 found both collapsing to 0-1 terms silently).
  function addTerms(raw: string) {
    const candidates = splitSpellingTerms(raw)
    if (!candidates.length) return
    let next = value
    let skippedWords = 0
    for (const term of candidates) {
      if (next.length >= MAX_KEYTERMS) { skippedWords = -1; break }
      const reason = validateTerm(term, next)
      if (reason === "max_words") { skippedWords++; continue }
      if (reason === "duplicate") continue
      next = [...next, term]
    }
    if (skippedWords === -1) {
      setSkipMessage(`Maximum ${MAX_KEYTERMS} terms reached.`)
    } else if (skippedWords > 0) {
      setSkipMessage(`${skippedWords} term${skippedWords === 1 ? "" : "s"} skipped (max 6 words)`)
    } else {
      setSkipMessage(undefined)
    }
    if (next !== value) onChange(next)
    setDraft("")
  }

  function removeTerm(term: string) {
    onChange(value.filter((t) => t !== term))
  }

  function applyRecentList(terms: string[]) {
    onChange(terms)
    setExpanded(true)
  }

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTerms(draft)
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTerm(value[value.length - 1])
    }
  }

  return (
    <div className="border-t-2 border-border-strong">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-fg-strong">Spelling hints</span>
        <span className="text-xs text-fg-muted">Optional · no extra cost</span>
      </div>

      {!expanded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3">
          <p className="text-xs text-fg-muted">
            Names or jargon in this video? Add them so the AI spells them right.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)} className="h-8 shrink-0">
            Add names &amp; terms
          </Button>
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-xs text-fg-muted">
            Only add names the AI is likely to get wrong. Similar-sounding names can replace correct words.
          </p>

          {suggestions.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-fg-subtle">From the title</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTerms(s)}
                    className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs text-fg-muted hover:text-fg-strong hover:border-border-strong"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border-2 border-border-strong bg-bg p-2",
              "focus-within:ring-2 focus-within:ring-accent-ring focus-within:border-accent"
            )}
          >
            {value.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-fg-strong"
              >
                {term}
                <button
                  type="button"
                  onClick={() => removeTerm(term)}
                  aria-label={`Remove ${term}`}
                  className="text-fg-muted hover:text-fg-strong"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id={fieldId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              onPaste={(e) => { e.preventDefault(); addTerms(e.clipboardData.getData("text")) }}
              onBlur={() => addTerms(draft)}
              placeholder={value.length === 0 ? "Eudaimonia, Wittgenstein, Habsburg…" : "Add another"}
              className="min-w-[8ch] flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </div>

          {skipMessage && <Notice tone="warning">{skipMessage}</Notice>}
          {!skipMessage && value.length > 0 && (
            <p className="text-xs text-fg-subtle">
              {value.length} / {MAX_KEYTERMS} terms
            </p>
          )}

          {recentLists.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-fg-subtle">Recently used</p>
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
            </div>
          )}
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
