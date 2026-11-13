// Tiny, client-safe sibling of citation.ts — just the style enum, no citeproc-js/CSL data (~340KB).
// Import THIS from client components (style dropdowns etc.); import citation.ts only from
// server-side code (API routes, the MCP backend's Python port) that actually renders a citation.
export type CitationStyle = "apa" | "mla" | "chicago" | "harvard"
export const CITATION_STYLES: CitationStyle[] = ["apa", "mla", "chicago", "harvard"]
