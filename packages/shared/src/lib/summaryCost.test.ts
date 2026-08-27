// Sync-check: the shared AI-summary cost mirror (pricing.ts summaryCreditCost) must match
// test-fixtures/summary_cost.json, which backend/test_summary_cost.py also checks against the backend
// financial path (credit_manager.calculate_summary_cost). A divergence means the app shows a different
// amount than the backend reserves/settles — a real-money bug. No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/summaryCost.test.ts
// scripts/check-playlist-invariants.sh runs this together with the backend side; a divergence fails
// the CLAUDE.md verification gate with a readable message.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { summaryCreditCost } from "./pricing.ts"

const fixturePath = fileURLToPath(new URL("../../../../test-fixtures/summary_cost.json", import.meta.url))
const fx = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  cases: { duration_seconds: number; credits: number }[]
}

let passed = 0
for (const { duration_seconds, credits } of fx.cases) {
  const got = summaryCreditCost(duration_seconds)
  assert.equal(
    got,
    credits,
    `summaryCreditCost(${duration_seconds}) = ${got} but the fixture has ${credits} — update pricing.ts + the fixture together, or restore the backend`,
  )
  console.log("  ✓", `cost(${duration_seconds}s)`, got)
  passed++
}

console.log(`${passed} passed`)
