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
    badge: "bg-sky-subtle text-sky",
    bar: "bg-sky",
    dot: "bg-sky",
    tint: "bg-sky-subtle",
    border: "border-sky",
    indicator: "bg-sky",
  },
  ai: {
    label: "AI transcription",
    short: "AI",
    badge: "bg-indigo-subtle text-indigo",
    bar: "bg-indigo",
    dot: "bg-indigo",
    tint: "bg-indigo-subtle",
    border: "border-indigo",
    indicator: "bg-indigo",
  },
}

// The "unavailable / not fetched" segment + label in cost bars and rows — always
// the error colour, never amber (amber is reserved for the single primary action).
export const UNAVAILABLE_BAR = "bg-error/60"
export const UNAVAILABLE_DOT = "bg-error/60"
export const UNAVAILABLE_TEXT = "text-error"
