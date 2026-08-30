// Sync-check: the shared upload-format mirror (uploadFormats.ts UPLOAD_EXTENSIONS) must match
// test-fixtures/upload_formats.json, which backend/test_upload_formats.py also checks against the
// backend enforcer (audio_utils.SUPPORTED_FORMATS). The two lists share no language (TS array vs
// Python set), so without this guard they drift the moment one layer changes. No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/uploadFormats.test.ts
// scripts/check-playlist-invariants.sh runs this together with the backend side; a divergence fails
// the CLAUDE.md verification gate with a readable message. Compared as SETS (order irrelevant).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { UPLOAD_EXTENSIONS } from "./uploadFormats.ts"

const fixturePath = fileURLToPath(new URL("../../../../test-fixtures/upload_formats.json", import.meta.url))
const fx = JSON.parse(readFileSync(fixturePath, "utf8")) as { extensions: string[] }

const fixture = [...fx.extensions].sort()
const mirror = [...UPLOAD_EXTENSIONS].sort()

assert.deepEqual(
  mirror,
  fixture,
  `UPLOAD_EXTENSIONS ${JSON.stringify(mirror)} != fixture ${JSON.stringify(fixture)} — ` +
    `update uploadFormats.ts, backend/audio_utils.py SUPPORTED_FORMATS, and ` +
    `test-fixtures/upload_formats.json together.`,
)

console.log(`  ✓ UPLOAD_EXTENSIONS == fixture (${mirror.length} extensions)`)
console.log("1 passed")
