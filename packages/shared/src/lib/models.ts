// Single source of truth for the AI MODEL NAMES shown in user-facing content.
// Analogous to pricing.ts: change a model name HERE, not in ~30 content files.
// Imported by marketing pages, articles and docs. Static .md/.txt mirrors cannot
// import TS — keep those in sync with the display names below by hand.
//
// Naming rule: PUBLIC prose uses a dot ("Universal-3.5 Pro"); code/API ids use
// dashes ("universal-3-5-pro"). See ADR-070.

// --- Speech-to-text (AI transcription) ---------------------------------------
// speech_models is a LANGUAGE ROUTER: AssemblyAI picks the best requested model
// that natively supports the detected language. We verified EN + AR resolve to
// Universal-3.5 Pro; do NOT claim one model does all 99 languages at top quality.
export const TRANSCRIPTION_MODEL = {
  // Public-facing name of our highest-quality speech-to-text model.
  displayName: "Universal-3.5 Pro",
  vendor: "AssemblyAI",
  // The live AssemblyAI router chain (API ids, dashes), highest quality first.
  chain: ["universal-3-5-pro", "universal-3-pro", "universal-2"] as const,
} as const

// --- AI summarization ---------------------------------------------------------
// ADR-068: summaries run on Gemini 2.5 Flash via the AssemblyAI EU LLM Gateway
// (EU data residency). NOT DeepSeek anymore.
export const SUMMARY_MODEL = {
  displayName: "Gemini 2.5 Flash",
  gateway: "AssemblyAI EU LLM Gateway",
} as const

// "AssemblyAI Universal-3.5 Pro"
export function transcriptionModelName(): string {
  return `${TRANSCRIPTION_MODEL.vendor} ${TRANSCRIPTION_MODEL.displayName}`
}

// Honest capability phrase for accuracy/language content: we route to the best
// model for the language, rather than claiming one model covers everything.
export function transcriptionRouterPhrase(): string {
  return `INDXR automatically uses the best available model for the language of your video — our highest-quality model, ${transcriptionModelName()}, for the languages it supports, with broad coverage across 99+ languages`
}

// "Gemini 2.5 Flash via the AssemblyAI EU LLM Gateway"
export function summaryModelName(): string {
  return `${SUMMARY_MODEL.displayName} via the ${SUMMARY_MODEL.gateway}`
}

// Vendor-neutral phrase for content that doesn't need the model name.
export function summaryGenericPhrase(): string {
  return "our AI summarization, processed in the EU"
}
