// Single source of truth for the transcript export menu. TranscriptCard RENDERS its
// dropdown from EXPORT_MENU, and content derives its counts from the same array — so
// adding/removing a format updates the menu AND every "N formats / M downloads" line
// at once. Never type the count in prose again (it drifted 6/7/8 three times before).

export type ExportGroup = "Text" | "Subtitles" | "Data" | "Developer"
export type ExportIcon = "FileText" | "FileCode" | "Film" | "Video" | "FileType" | "FileJson"
export type ExportItemId = "txt" | "txt_ts" | "md" | "md_ts" | "srt" | "vtt" | "csv" | "json" | "rag"

export interface ExportMenuItem {
  id: ExportItemId
  group: ExportGroup
  label: string
  sub: string
  icon: ExportIcon
  /** Base format, for the FORMAT count (variants like "with timestamps" share a format). */
  format: string
  /** RAG JSON is the only paid export (auth-gated + credit cost). */
  paid?: boolean
}

export const EXPORT_MENU: ExportMenuItem[] = [
  { id: "txt", group: "Text", label: "TXT — plain text", sub: "No timestamps", icon: "FileText", format: "TXT" },
  { id: "txt_ts", group: "Text", label: "TXT — with timestamps", sub: "[HH:MM:SS] per line", icon: "FileText", format: "TXT" },
  { id: "md", group: "Text", label: "Markdown", sub: "Notion, Obsidian, blog", icon: "FileCode", format: "Markdown" },
  { id: "md_ts", group: "Text", label: "Markdown — with timestamps", sub: "Sections per timestamp", icon: "FileCode", format: "Markdown" },
  { id: "srt", group: "Subtitles", label: "SRT", sub: "SubRip Subtitle", icon: "Film", format: "SRT" },
  { id: "vtt", group: "Subtitles", label: "VTT", sub: "Web Video Text", icon: "Video", format: "VTT" },
  { id: "csv", group: "Data", label: "CSV", sub: "Spreadsheet compatible", icon: "FileType", format: "CSV" },
  { id: "json", group: "Data", label: "JSON", sub: "segments with start/end time", icon: "FileJson", format: "JSON" },
  { id: "rag", group: "Developer", label: "RAG JSON", sub: "LangChain, LlamaIndex, Pinecone", icon: "FileJson", format: "RAG JSON", paid: true },
]

export const EXPORT_GROUPS: ExportGroup[] = ["Text", "Subtitles", "Data", "Developer"]

/** Distinct base formats (TXT, Markdown, SRT, VTT, CSV, JSON, RAG JSON) → 7. */
export const EXPORT_FORMAT_COUNT = new Set(EXPORT_MENU.map((i) => i.format)).size
/** Menu items incl. timestamp variants → 9. */
export const EXPORT_DOWNLOAD_COUNT = EXPORT_MENU.length
/** Distinct free formats (everything except RAG JSON). */
export const EXPORT_FREE_FORMAT_COUNT = new Set(EXPORT_MENU.filter((i) => !i.paid).map((i) => i.format)).size

/** Distinct format labels in menu order: ["TXT","Markdown","SRT","VTT","CSV","JSON","RAG JSON"].
    Prose lists (hero, marketing) derive from this so they can never drift from the export menu. */
export const EXPORT_FORMAT_LABELS = EXPORT_MENU.reduce<string[]>((acc, i) => {
  if (!acc.includes(i.format)) acc.push(i.format)
  return acc
}, [])

/** Oxford-comma prose list: "TXT, Markdown, …, JSON, or RAG JSON" (pass "and" for the and-form). */
export function exportFormatsProse(conj: "or" | "and" = "or"): string {
  const l = EXPORT_FORMAT_LABELS
  return `${l.slice(0, -1).join(", ")}, ${conj} ${l[l.length - 1]}`
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
/** Spell a small count for prose ("seven"), so content stays natural while deriving from code. */
export function spellCount(n: number): string {
  return WORDS[n] ?? String(n)
}
