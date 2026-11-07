// Single source for the transcription-method colour convention (ADR-080).
//
// A transcription method has ONE colour across the whole product, and it is the
// exact colour the Library badge component already uses (apps/app/.../library/
// TranscriptList.tsx → BADGE_CLASSES): YouTube captions = sky, AI transcription =
// indigo. No new colours, no duplicated hex — every class below resolves to the
// --sky / --indigo tokens defined once in tokens.css.
//
// Only the METHOD axis propagates through the transcribe flow (method choice →
// playlist summary → per-video rows → progress → completion → Library). The SOURCE
// axis (YouTube video / playlist / uploaded file) is a separate Library concern.
// An audio upload has no separate source badge — it is transcribed via AssemblyAI,
// so it uses the AI (indigo) method colour.
//
// Colour semantics elsewhere in this flow: green = free / new / fully succeeded,
// red = unavailable / failed. Yellow does not appear.

export type TranscribeMethod = "captions" | "ai"

export const METHOD_META: Record<
  TranscribeMethod,
  {
    label: string // full label, e.g. "YouTube captions"
    short: string // compact label for dense rows, e.g. "Captions"
    badge: string // Library badge classes (subtle bg + base text) — AA-verified there
    bar: string // solid segment fill for cost bars
    dot: string // legend swatch
    tint: string // selected radio-card background tint
    border: string // selected radio-card / indicator border
    indicator: string // filled radio dot
  }
> = {
  captions: {
    label: "YouTube captions",
    short: "Captions",
    badge: "border border-fg-strong text-fg-strong", // stijl B (2026-11-07): ink, matches library badges
    // Stijl B (2026-11-07): no hue families. Captions = mid grey, AI = ink — still two clearly
    // different segments in the cost bars, without colour carrying the meaning alone (labels do).
    bar: "bg-fg-muted",
    dot: "bg-fg-muted",
    tint: "bg-bg-subtle",
    border: "border-fg-strong",
    indicator: "bg-fg-strong",
  },
  ai: {
    label: "AI transcription",
    short: "AI",
    badge: "border border-fg-strong bg-fg-strong text-bg", // stijl B: ink fill, matches library AI badge
    bar: "bg-fg-strong",
    dot: "bg-fg-strong",
    tint: "bg-bg-subtle",
    border: "border-fg-strong",
    indicator: "bg-fg-strong",
  },
}

// The "unavailable / not fetched" segment + label in cost bars and rows — always
// the error colour, never amber (amber is reserved for the single primary action).
export const UNAVAILABLE_BAR = "bg-error/60"
export const UNAVAILABLE_DOT = "bg-error/60"
export const UNAVAILABLE_TEXT = "text-error"
