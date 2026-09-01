// Single source of truth for accepted audio/video upload formats. AudioTab's accept="" attr,
// its client-side validTypes guard, its drop-zone label, and every "we accept MP3, …" line in
// marketing/docs content all derive from here — so adding or removing a format updates the UI AND
// the copy at once. The label used to list only 7 of the 9 accepted formats (it dropped MPEG and
// MPGA), which is exactly the kind of hand-typed drift this file exists to kill.
//
// Backend authority: the server rejects anything outside backend/audio_utils.py SUPPORTED_FORMATS.
// The two lists are kept in lockstep by test-fixtures/upload_formats.json — the fixture guard
// (backend/test_upload_formats.py + uploadFormats.test.ts, run by scripts/check-playlist-invariants.sh)
// goes red if this array and SUPPORTED_FORMATS ever diverge from the fixture. MAX_FILE_SIZE_MB = 500.
// MOV and FLV are on AssemblyAI's supported list and are sent raw; AVI and MKV are not, so the backend
// extracts their audio before submit (transparent to the user). OGG and OPUS are the same Ogg-Opus
// container (WhatsApp exports voice notes as .opus); AAC (raw ADTS) rides its own container — all three
// are on AssemblyAI's supported list and sent raw. Validation is extension-only across every layer
// (frontend accept-attr + guard, backend validate_audio_file), never MIME — audio MIME is unreliable
// (audio/opus, audio/ogg, audio/aac, application/octet-stream by OS/browser), so extension is the sole ground.

import { spellCount } from "./exportFormats.ts"

export const UPLOAD_EXTENSIONS = [
  ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".aac", ".wav", ".webm", ".ogg", ".opus", ".flac",
  ".mov", ".flv", ".avi", ".mkv",
] as const

/** Per-file upload size cap (matches audio_utils.py MAX_FILE_SIZE_MB). */
export const UPLOAD_MAX_FILE_MB = 500

/** 15 accepted formats. */
export const UPLOAD_FORMAT_COUNT = UPLOAD_EXTENSIONS.length
/** "fifteen" — for prose, so the count and the list can never disagree. */
export const UPLOAD_FORMAT_COUNT_WORD = spellCount(UPLOAD_FORMAT_COUNT)

// MIME type per extension, derived here from the one extension list (kept in this file so the two
// never drift). iOS Safari filters unreliably on extensions alone — an accept="" with only extensions
// can yield a greyed-out/empty file picker on iPhone (LESSONS 2026-09-01). So the accept string carries
// BOTH: the extensions (desktop file dialogs) AND MIME types. Every UPLOAD_EXTENSIONS entry must have a
// mapping below; the guard asserts it so a new format can't silently ship without its MIME.
const EXT_MIME: Record<(typeof UPLOAD_EXTENSIONS)[number], string> = {
  ".mp3": "audio/mpeg", ".mpga": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac",
  ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/ogg", ".flac": "audio/flac",
  ".mp4": "video/mp4", ".mpeg": "video/mpeg", ".webm": "video/webm", ".mov": "video/quicktime",
  ".flv": "video/x-flv", ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
}
// Fail loudly at import if a format lacks a MIME mapping (drift guard).
for (const e of UPLOAD_EXTENSIONS) {
  if (!EXT_MIME[e]) throw new Error(`uploadFormats: missing MIME for ${e}`)
}

/** Unique MIME types, derived from the extension list. */
export const UPLOAD_MIME_TYPES = [...new Set(UPLOAD_EXTENSIONS.map((e) => EXT_MIME[e]))]

// For an <input accept="…"> attribute. Extensions + specific MIME + the broad audio/* video/*
// families. The broad families keep the mobile picker from showing NOTHING selectable (a picker that
// shows all audio/video and lets our own extension + content validation reject the rest is far better
// than a picker that opens empty). Order: extensions first (desktop dialogs prefer them).
export const UPLOAD_ACCEPT_ATTR = [
  ...UPLOAD_EXTENSIONS,
  ...UPLOAD_MIME_TYPES,
  "audio/*",
  "video/*",
].join(",")

/** Uppercase labels: ["MP3","MP4","MPEG",…] */
export const UPLOAD_FORMAT_LABELS = UPLOAD_EXTENSIONS.map((e) => e.slice(1).toUpperCase())

// Presentation-only split for grouped tables. The backend treats everything as audio
// (it extracts the track from a video when the provider needs it), so this classification
// exists purely so content can list audio and video separately. The two label lists always
// partition UPLOAD_EXTENSIONS, so neither can drift from the accepted set.
const UPLOAD_VIDEO_EXTENSIONS = new Set<string>([
  ".mp4", ".mpeg", ".webm", ".mov", ".flv", ".avi", ".mkv",
])

/** Uppercase audio-format labels, in UPLOAD_EXTENSIONS order: ["MP3","MPGA",…]. */
export const UPLOAD_AUDIO_LABELS = UPLOAD_EXTENSIONS
  .filter((e) => !UPLOAD_VIDEO_EXTENSIONS.has(e))
  .map((e) => e.slice(1).toUpperCase())

/** Uppercase video-format labels, in UPLOAD_EXTENSIONS order: ["MP4","MPEG",…]. */
export const UPLOAD_VIDEO_LABELS = UPLOAD_EXTENSIONS
  .filter((e) => UPLOAD_VIDEO_EXTENSIONS.has(e))
  .map((e) => e.slice(1).toUpperCase())

/** Plain comma list, no conjunction: "MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM, OGG, FLAC". */
export const UPLOAD_FORMATS_LIST = UPLOAD_FORMAT_LABELS.join(", ")

/** Oxford-comma prose list: "MP3, MP4, …, OGG, or FLAC" (pass "and" for the and-form). */
export function uploadFormatsProse(conj: "or" | "and" = "or"): string {
  const l = UPLOAD_FORMAT_LABELS
  return `${l.slice(0, -1).join(", ")}, ${conj} ${l[l.length - 1]}`
}
