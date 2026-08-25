// Single source of truth for broadcast-subtitle (SRT/VTT) segmentation. These values are consumed by
// the cue builder in ../utils/formatTranscript.ts (generateSrt / generateVtt / buildSubtitleCues) AND
// interpolated verbatim into the SRT/VTT spec pages
// (apps/marketing/src/app/docs/reference/export-formats/{srt,vtt}) so the documented numbers can never
// drift from the code. Never re-type these values in prose — import and interpolate them.
//
// Provenance: the Netflix Timed Text Style Guide (the most-cited industry spec) — 42 characters per
// line, at most 2 lines per cue, at most 7 s per cue. Netflix's minimum cue duration is 5/6 s
// (~0.83 s); we are stricter at 1 s. Reading speed: Netflix caps adult English at 20 cps; we allow a
// hard ceiling of 21 cps (one above the limit) because we transcribe verbatim rather than condensing
// the spoken text the way a professional subtitler does — see ADR-094.

/** Max characters per subtitle line. */
export const SUBTITLE_MAX_LINE = 42;
/** Max lines per cue. */
export const SUBTITLE_MAX_LINES = 2;
/** Hard cap on how long a single cue stays on screen (seconds). */
export const SUBTITLE_MAX_CUE_SEC = 7;
/** Minimum a cue stays on screen (seconds) — Netflix uses 5/6 s; we are stricter. */
export const SUBTITLE_MIN_CUE_SEC = 1;
/** Reading-speed target (characters/second): cues are lengthened into silent gaps toward this. */
export const SUBTITLE_TARGET_CPS = 20;
/** Hard reading-speed ceiling (characters/second): one above the Netflix limit (verbatim trade-off). */
export const SUBTITLE_CEIL_CPS = 21;
