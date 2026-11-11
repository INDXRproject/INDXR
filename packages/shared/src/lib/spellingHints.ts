// Spelling-hints parsing (AssemblyAI keyterms_prompt) — mirrors backend/spelling_hints.py exactly
// so the UI never accepts a list the backend would then reject. AI-transcription only (never shown
// for caption extraction).

export const MAX_KEYTERMS = 50
export const MAX_WORDS_PER_TERM = 6

export interface ParsedSpellingHints {
  terms: string[]
  error?: string
}

/**
 * Split a comma-separated spelling-hints string into a clean term list: trims whitespace, drops
 * empties, dedupes case-insensitively (first-seen casing wins), and drops any single term with
 * more than MAX_WORDS_PER_TERM words. Returns a friendly error instead of silently truncating when
 * the result exceeds MAX_KEYTERMS, so the user knows to shorten the list.
 */
export function parseSpellingHints(raw: string): ParsedSpellingHints {
  if (!raw) return { terms: [] }

  const seenLower = new Set<string>()
  const terms: string[] = []
  for (const candidate of raw.split(",")) {
    const term = candidate.trim()
    if (!term) continue
    if (term.split(/\s+/).length > MAX_WORDS_PER_TERM) continue
    const key = term.toLowerCase()
    if (seenLower.has(key)) continue
    seenLower.add(key)
    terms.push(term)
  }

  if (terms.length > MAX_KEYTERMS) {
    return {
      terms: terms.slice(0, MAX_KEYTERMS),
      error: `Too many spelling hints (${terms.length}); maximum is ${MAX_KEYTERMS}.`,
    }
  }

  return { terms }
}
