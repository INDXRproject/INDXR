// Pure string logic, zero heavy deps (no citeproc/CSL) — safe to import from a "use client"
// component (formatTranscript.ts's markdown export runs entirely in the browser). citation.ts
// re-exports this for its own (server-side) API-route callers.

/** Stable per-source citekey ("kanaaljaartitelwoord") for `[@citekey]` in Obsidian/Pandoc —
 *  deterministic from the source data alone, so re-exporting the same transcript never changes
 *  it. Disambiguation (same channel+year+first-word twice) is the caller's responsibility
 *  (append -2/-3 — fase 1 scope doesn't need it: one transcript = one citekey). */
export function buildCitekey(data: { channel?: string | null; title: string; publishedAt?: string | null }): string {
  const year = data.publishedAt ? data.publishedAt.slice(0, 4) : "nd"
  const channel = (data.channel || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "")
  const firstWord = (data.title.match(/[a-zA-Z]+/) || ["source"])[0].toLowerCase()
  return `${channel}${year}${firstWord}`
}
