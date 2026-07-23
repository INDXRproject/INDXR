// Single source of truth for the library-storage figure shown to users on the account page.
//
// This is the intended DISPLAY limit (a soft guide), and it is deliberately the ONLY place the
// number lives so a second value can't drift into the UI again (the old sidebar meter hardcoded
// 500 MB separately).
//
// The database is the real counter: user_credits.library_bytes is the exact footprint
// (octet_length of the transcript/edited_content/ai_summary/rag_exports jsonb, maintained by a
// trigger — see migration 20260711100400_library_bytes_meter.sql). Its column
// user_credits.library_bytes_cap defaults to 5 GiB and is a grandfather-safe, UNENFORCED cap:
// nothing is blocked when a user exceeds either this display limit or the DB cap. If the display
// limit and the DB cap should ever converge, change them together — this constant plus the column
// default — so the two truths stay reconciled.
export const LIBRARY_STORAGE_LIMIT_MB = 100

// The real, unenforced database cap (bytes), surfaced here so it isn't a hidden second number.
export const LIBRARY_STORAGE_DB_CAP_BYTES = 5368709120 // 5 GiB (user_credits.library_bytes_cap default)
