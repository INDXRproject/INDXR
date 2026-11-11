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

/**
 * Stable, order-independent fingerprint of a term list — mirrors backend/spelling_hints.py's
 * keyterms_signature(). Used to make the idempotency-key ACTION string hint-aware: a request with
 * different (or absent vs present) hints must mint a genuinely new sessionStorage key, so it never
 * reuses an in-flight key and risks either silently merging into the wrong job or hitting the
 * idempotency-mismatch 422 path. See the keyterms-ADR follow-up (dedup bug, 2026-11-11).
 */
export function keytermsSignature(terms: string[]): string {
  if (!terms.length) return "none"
  return [...terms].map((t) => t.toLowerCase()).sort().join("|")
}

/**
 * Validate a single candidate term for the pill-input UI. Returns a skip reason when the term
 * should not be added (too many words, or already present case-insensitively), or null when it's
 * fine to add. Pure UI-side guard — the backend's parse_keyterms() re-validates independently.
 */
export function validateTerm(term: string, existing: string[]): "max_words" | "duplicate" | null {
  const trimmed = term.trim()
  if (!trimmed) return null
  if (trimmed.split(/\s+/).length > MAX_WORDS_PER_TERM) return "max_words"
  if (existing.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return "duplicate"
  return null
}

// Common filler/connector words that show up in video titles but are never themselves a proper
// name — used to break a run of capitalized words into the actual name sub-sequences. E.g. "Can
// Firas Zahabi Take Kevin Lee to the Next Level?" should yield "Firas Zahabi" + "Kevin Lee", not
// one 6-word run and not "Next Level". Deliberately a short, hand-picked list, not a dictionary —
// this is a heuristic (deterministic, no LLM), imperfection is expected and acceptable.
const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "and", "but", "or", "nor", "so", "yet",
  "to", "of", "in", "on", "at", "for", "with", "from", "into", "onto", "over", "under", "about",
  "your", "you", "my", "our", "his", "her", "its", "their", "i", "we", "they", "he", "she", "it",
  "can", "will", "does", "do", "did", "is", "are", "was", "were", "be", "been", "being",
  "take", "takes", "make", "makes", "get", "gets", "go", "goes", "want", "wants", "need", "needs",
  "next", "level", "part", "episode", "season", "series", "show", "game", "world", "live",
  "new", "best", "top", "how", "why", "what", "who", "when", "where", "which",
  "official", "trailer", "breaking", "news", "update", "explained", "explainer", "tutorial",
  "interview", "podcast", "year", "years", "day", "days", "week", "first", "last",
  "big", "great", "amazing", "insane", "crazy", "secret", "secrets", "truth", "real",
  "story", "stories", "full", "guide", "review", "vs", "versus", "reaction", "react",
  "highlights", "highlight", "moments", "moment", "clip", "clips", "short", "shorts",
  "must", "watch", "see", "now", "today", "finally", "actually", "literally", "exactly",
  "every", "single", "all", "only", "just", "still", "also", "even", "ever", "never", "always",
])

/**
 * Deterministic "proper names from the title" suggestion chips (no LLM). Breaks the title into
 * runs of consecutive capitalized, non-stopword words and keeps runs of 2+ words — a lone
 * capitalized word is too likely to be a sentence-leading filler ("Can", "Take") rather than a
 * name. The channel name is included as its own candidate when it isn't itself a stopword.
 */
export function suggestTermsFromTitle(title?: string | null, channel?: string | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  if (title) {
    const tokens = title.replace(/[?!:;,.]/g, " ").split(/\s+/).filter(Boolean)
    let run: string[] = []
    const flush = () => {
      if (run.length >= 2) {
        const term = run.join(" ")
        const key = term.toLowerCase()
        if (!seen.has(key)) { seen.add(key); out.push(term) }
      }
      run = []
    }
    // Lowercase name-prefixes ("al-Rashid", "ibn-Khalid") count as capitalized too — common in
    // Arabic/historical names and otherwise broken by the plain /^[A-Z]/ check.
    const NAME_PREFIX = /^(al|el|ibn|bin|abu|dos|das|de|van|von|la|le|di)[-'’]/i
    for (const tok of tokens) {
      const isCapitalized = /^[A-Z]/.test(tok) || NAME_PREFIX.test(tok)
      const isStopword = TITLE_STOPWORDS.has(tok.toLowerCase().replace(/['’].*$/, ""))
      if (isCapitalized && !isStopword) run.push(tok)
      else flush()
    }
    flush()
  }

  if (channel) {
    const trimmed = channel.trim()
    if (trimmed && !TITLE_STOPWORDS.has(trimmed.toLowerCase()) && !seen.has(trimmed.toLowerCase())) {
      out.push(trimmed)
    }
  }

  return out.slice(0, 8)
}
