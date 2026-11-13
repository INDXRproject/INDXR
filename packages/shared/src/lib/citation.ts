import CSL from "citeproc"
import { APA_CSL, MLA_CSL, CHICAGO_CSL, HARVARD_CSL, LOCALE_EN_US_XML } from "./csl-styles/data.ts"
import { CITATION_STYLES, type CitationStyle } from "./citationStyles.ts"
import { buildCitekey } from "./citekey.ts"

// Server-only (citeproc-js + ~340KB of CSL/locale XML) — never import this from a "use client"
// component; import citationStyles.ts for just the style list/type, and fetch a rendered string
// from an API route for the actual citation text. The CSL XML is inlined as string constants
// (csl-styles/data.ts, generated once from the official citation-style-language/styles + locales
// repos — see csl-styles/*.csl for the readable originals) rather than read via fs at runtime, so
// it ships in every build/deploy without extra Next.js file-tracing config. citeproc-js renders
// the REAL APA 7th/MLA 9th/Chicago 18th (author-date)/Harvard ("Cite Them Right" 12th) styles —
// not a hand-rolled imitation per style.

export { CITATION_STYLES, type CitationStyle, buildCitekey }

export interface CitationSourceData {
  title: string
  channel?: string | null
  videoId?: string | null
  publishedAt?: string | null // YYYY-MM-DD
  language?: string | null
}

const STYLE_XML: Record<CitationStyle, string> = { apa: APA_CSL, mla: MLA_CSL, chicago: CHICAGO_CSL, harvard: HARVARD_CSL }
function loadLocaleXml(): string {
  return LOCALE_EN_US_XML
}
function loadStyleXml(style: CitationStyle): string {
  return STYLE_XML[style]
}

function parseDateParts(iso?: string | null): number[][] | undefined {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return undefined
  return [[Number(m[1]), Number(m[2]), Number(m[3])]]
}

function todayDateParts(): number[][] {
  const now = new Date()
  return [[now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()]]
}

/** Single source of truth: CSL-JSON for a transcript, the canonical record every export (styled
 *  citation, .ris, .bib, Zotero Connector) derives from. `motion_picture` is Zotero's "Video
 *  Recording" type; `song` is Zotero's "Audio Recording" type — CSL has no generic "recording"
 *  type, and an uploaded file (no video_id) isn't necessarily music, but `song` is the closest
 *  CSL has and is what the roadmap names for this case. */
export function buildCslJson(id: string, data: CitationSourceData): Record<string, unknown> {
  const issued = parseDateParts(data.publishedAt)
  const item: Record<string, unknown> = {
    id,
    type: data.videoId ? "motion_picture" : "song",
    title: data.title,
    author: [{ literal: data.channel?.trim() || (data.videoId ? "Unknown channel" : "Unknown") }],
  }
  if (issued) item.issued = { "date-parts": issued }
  if (data.videoId) {
    item.URL = `https://youtu.be/${data.videoId}`
    item.publisher = "YouTube"
    item.accessed = { "date-parts": todayDateParts() }
  }
  if (data.language) item.language = data.language
  return item
}

/** Renders a CSL-JSON item in one of the four official styles. Returns plain text (for the
 *  copy-to-clipboard text/plain variant and .txt-style display) and an HTML variant (title in
 *  <i>, for the rich-text clipboard write — Word/Docs/Notion paste the title italic). */
export function renderCitation(item: Record<string, unknown>, style: CitationStyle = "apa"): { plain: string; html: string } {
  const sys = {
    retrieveLocale: () => loadLocaleXml(),
    retrieveItem: () => item,
  }
  const engine = new CSL.Engine(sys, loadStyleXml(style), "en-US")
  engine.updateItems([item.id as string])
  const bib = engine.makeBibliography()
  const rawHtml: string = (bib?.[1]?.[0] as string) ?? ""
  const html = rawHtml.replace(/^\s*<div class="csl-entry">\s*/, "").replace(/\s*<\/div>\s*$/, "").trim()
  const plain = html
    .replace(/<\/?i>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
  return { plain, html }
}

function risType(item: Record<string, unknown>): string {
  return item.type === "motion_picture" ? "VIDEO" : "SOUND"
}

/** Minimal RIS export (one item). RIS has no CSL-JSON-equivalent generic "recording" tag — VIDEO
 *  for a YouTube source, SOUND for an uploaded recording, matching what EndNote/Zotero use for
 *  their Video/Audio Recording item types. */
export function buildRis(item: Record<string, unknown>): string {
  const lines: string[] = [`TY  - ${risType(item)}`]
  const authors = (item.author as Array<{ literal?: string }>) || []
  for (const a of authors) if (a.literal) lines.push(`AU  - ${a.literal}`)
  lines.push(`TI  - ${item.title}`)
  const issued = (item.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]
  if (issued) {
    lines.push(`PY  - ${issued[0]}`)
    lines.push(`DA  - ${issued.join("/")}`)
  }
  if (item.URL) lines.push(`UR  - ${item.URL}`)
  if (item.publisher) lines.push(`PB  - ${item.publisher}`)
  if (item.language) lines.push(`LA  - ${item.language}`)
  lines.push("ER  - ")
  return lines.join("\n") + "\n"
}

/** Minimal BibLaTeX export (one item). `@video`/`@audio` are standard BibLaTeX entry types
 *  (biblatex >= 3.7) understood by Pandoc and the Obsidian Citations plugin — not `@misc`, which
 *  loses the type information Zotero/Pandoc would otherwise render (e.g. "[Video]"). */
export function buildBibLatex(item: Record<string, unknown>, citekey: string): string {
  const entryType = item.type === "motion_picture" ? "video" : "audio"
  const authors = ((item.author as Array<{ literal?: string }>) || []).map((a) => a.literal).filter(Boolean).join(" and ")
  const issued = (item.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]
  const fields: string[] = [`  author = {${authors}}`, `  title = {${item.title}}`]
  if (issued) fields.push(`  year = {${issued[0]}}`)
  if (item.URL) {
    fields.push(`  url = {${item.URL}}`)
    fields.push(`  urldate = {${new Date().toISOString().slice(0, 10)}}`)
  }
  if (item.publisher) fields.push(`  organization = {${item.publisher}}`)
  return `@${entryType}{${citekey},\n${fields.join(",\n")}\n}\n`
}
