// Sync-check: the shared limits mirror (limits.ts) must match test-fixtures/playlist_limits.json,
// which backend/test_playlist_limits.py also checks against the backend enforcer. No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/limits.test.ts
// scripts/check-playlist-invariants.sh runs this together with the backend side; a divergence fails
// the CLAUDE.md verification gate with a readable message.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  MAX_PLAYLIST_VIDEOS_PER_JOB,
  MAX_CONCURRENT_JOBS,
  MAX_TRANSCRIPTION_SECONDS,
  PLAYLIST_LARGE_JOB_WARN_AT,
} from "./limits.ts"

const fixturePath = fileURLToPath(new URL("../../../../test-fixtures/playlist_limits.json", import.meta.url))
const fx = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  videos_per_job: number
  concurrent_jobs: number
  transcription_max_seconds: number
  large_job_warn_at: number
}

let passed = 0
function check(name: string, got: number, want: number) {
  assert.equal(
    got,
    want,
    `${name}: limits.ts has ${got} but the fixture has ${want} — update limits.ts + the fixture together, or restore the backend`,
  )
  console.log("  ✓", name, got)
  passed++
}

check("videos_per_job", MAX_PLAYLIST_VIDEOS_PER_JOB, fx.videos_per_job)
check("concurrent_jobs", MAX_CONCURRENT_JOBS, fx.concurrent_jobs)
check("transcription_max_seconds", MAX_TRANSCRIPTION_SECONDS, fx.transcription_max_seconds)
check("large_job_warn_at", PLAYLIST_LARGE_JOB_WARN_AT, fx.large_job_warn_at)

console.log(`${passed} passed`)
