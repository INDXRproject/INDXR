// Single source of truth for accepted audio/video upload formats. AudioTab's accept="" attr,
// its client-side validTypes guard, its drop-zone label, and every "we accept MP3, …" line in
// marketing/docs content all derive from here — so adding or removing a format updates the UI AND
// the copy at once. The label used to list only 7 of the 9 accepted formats (it dropped MPEG and
// MPGA), which is exactly the kind of hand-typed drift this file exists to kill.
//
// Backend authority: the server rejects anything outside backend/audio_utils.py SUPPORTED_FORMATS
// (verified 2026-08-12: the same 13 extensions) with MAX_FILE_SIZE_MB = 500. This array must stay in
// lockstep with that set — the backend is what actually enforces acceptance. MOV and FLV are on
// AssemblyAI's supported list and are sent raw; AVI and MKV are not, so the backend extracts their
// audio before submit (transparent to the user).

import { spellCount } from "./exportFormats"

export const UPLOAD_EXTENSIONS = [
  ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg", ".flac",
  ".mov", ".flv", ".avi", ".mkv",
] as const

/** Per-file upload size cap (matches audio_utils.py MAX_FILE_SIZE_MB). */
export const UPLOAD_MAX_FILE_MB = 500

/** 9 accepted formats. */
export const UPLOAD_FORMAT_COUNT = UPLOAD_EXTENSIONS.length
/** "nine" — for prose, so the count and the list can never disagree. */
export const UPLOAD_FORMAT_COUNT_WORD = spellCount(UPLOAD_FORMAT_COUNT)

/** For an <input accept="…"> attribute: ".mp3,.mp4,…". */
export const UPLOAD_ACCEPT_ATTR = UPLOAD_EXTENSIONS.join(",")

/** Uppercase labels: ["MP3","MP4","MPEG",…] */
export const UPLOAD_FORMAT_LABELS = UPLOAD_EXTENSIONS.map((e) => e.slice(1).toUpperCase())

/** Plain comma list, no conjunction: "MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM, OGG, FLAC". */
export const UPLOAD_FORMATS_LIST = UPLOAD_FORMAT_LABELS.join(", ")

/** Oxford-comma prose list: "MP3, MP4, …, OGG, or FLAC" (pass "and" for the and-form). */
export function uploadFormatsProse(conj: "or" | "and" = "or"): string {
  const l = UPLOAD_FORMAT_LABELS
  return `${l.slice(0, -1).join(", ")}, ${conj} ${l[l.length - 1]}`
}
