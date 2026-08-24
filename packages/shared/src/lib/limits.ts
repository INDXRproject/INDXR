// Single TS source for the hard playlist/job limits, so every TS consumer (the playlist-extract
// route, PlaylistManager, the /docs/reference/limits page and the playlist article) reads one value
// instead of a scattered literal.
//
// The BACKEND is the enforcer: MAX_PLAYLIST_VIDEOS, MAX_CONCURRENT_JOBS and MAX_TRANSCRIPTION_SECONDS
// all live in backend/limits.py (imported by main.py + transcription_pipeline.py). These TS values are
// a MIRROR and must not drift from it. scripts/check-playlist-invariants.sh asserts both the backend
// constants (backend/test_playlist_limits.py) and these TS values (limits.test.ts) against
// test-fixtures/playlist_limits.json, so a divergence fails the verification gate with a readable message.
//
// PLAYLIST_LARGE_JOB_WARN_AT is UI-only: the review screen warns at or above it. It has no backend
// counterpart, so only the TS side is checked against the fixture for that one.

/** Max videos a single playlist job will process; larger playlists are split into batches. */
export const MAX_PLAYLIST_VIDEOS_PER_JOB = 500

/** Max transcription/extraction jobs a user can have running at once. */
export const MAX_CONCURRENT_JOBS = 3

/** AssemblyAI's accepted ceiling per AI-transcribed file, in seconds (caption extraction is uncapped). */
export const MAX_TRANSCRIPTION_SECONDS = 36000

/** The same ceiling in hours, for prose. */
export const MAX_TRANSCRIPTION_HOURS = MAX_TRANSCRIPTION_SECONDS / 3600

/** Review-screen soft warning: at or above this many selected videos, the job is flagged as large
    (it still runs; this is a heads-up, not a cap). UI-only, no backend counterpart. */
export const PLAYLIST_LARGE_JOB_WARN_AT = 50
