// Sync-check: parseSpellingHints() must split every case in the shared fixture
// test-fixtures/spelling_hints_split.json into the expected term count — mirrors
// backend/test_spelling_hints_split.py against backend/spelling_hints.py parse_keyterms(). Live
// found 2026-11-12: Arabic commas (،) and newline/semicolon weren't split, giving 0/1 terms
// instead of 3/4. No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/spellingHints.test.ts
// scripts/check-playlist-invariants.sh runs this together with the backend side.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseSpellingHints } from "./spellingHints.ts"

const fixturePath = fileURLToPath(new URL("../../../../test-fixtures/spelling_hints_split.json", import.meta.url))
const fx = JSON.parse(readFileSync(fixturePath, "utf8")) as { cases: Array<{ input: string; expected_count: number }> }

let passed = 0
for (const c of fx.cases) {
  const { terms } = parseSpellingHints(c.input)
  assert.equal(
    terms.length,
    c.expected_count,
    `${JSON.stringify(c.input)}: got ${terms.length} terms ${JSON.stringify(terms)}, expected ${c.expected_count}`,
  )
  console.log(`  ✓ ${JSON.stringify(c.input)}: ${terms.length} terms`)
  passed++
}

console.log(`${passed} passed`)
