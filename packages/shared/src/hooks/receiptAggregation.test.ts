// Pure unit tests for the net-final playlist receipt aggregation (ADR-050 fase 3).
// No framework — run: node --experimental-strip-types packages/shared/src/hooks/receiptAggregation.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { aggregatePlaylistReceipt, type ReceiptJobRow, type ReceiptTx } from "./receiptAggregation.ts"
import { playlistFreeIds } from "../lib/pricing.ts"

let passed = 0
function test(name: string, fn: () => void) { fn(); passed++; console.log("  ✓", name) }
const settle = (video_id: string, amount: number): ReceiptTx => ({ kind: "settlement", amount, metadata: { video_id } })

// ── 1. error→success across a retry: counted ONCE as transcribed, credit in used not refunded
test("recovered video (error in run 1, success on retry) is charged, not refunded", () => {
  const j1: ReceiptJobRow = {
    id: "j1", is_retry: false, credits_reserved: 1, credits_refunded: 1,
    video_ids: ["v0", "v1", "v2", "v3"], use_whisper_ids: [],
    video_results: {
      v0: { status: "success" }, v1: { status: "success" }, v2: { status: "success" },
      v3: { status: "error", error_type: "bot_detection" },   // failed in run 1 → run-1 refund of 1
    },
  }
  const j2: ReceiptJobRow = {
    id: "j2", is_retry: true, credits_reserved: 1, credits_refunded: 0,
    video_ids: ["v3"], use_whisper_ids: [], video_results: { v3: { status: "success" } },
  }
  const r = aggregatePlaylistReceipt([j1, j2], [settle("v3", 1)], "j1")
  assert.equal(r.used, 1, "used = v3's retry settlement")
  assert.equal(r.refunded, 0, "run-1 refund of v3 must NOT leak into not-used (it was re-charged)")
  assert.equal(r.transcribedCount, 4)
  assert.equal(r.skippedCount, 0)
  const v3 = r.videos.filter(v => v.videoId === "v3")
  assert.equal(v3.length, 1, "v3 appears exactly once")
  assert.deepEqual({ state: v3[0].state, credits: v3[0].credits }, { state: "charged", credits: 1 })
})

// ── 2. An-Najm-shaped churn: mixed recover + permanent skips; not-used == final skips only
test("mixed retry outcome: not-used reflects only finally-skipped videos (no churn)", () => {
  // 6 captions, first 3 free. d charged. e bot_detection→recovers on retry. f extraction_error stays.
  const j1: ReceiptJobRow = {
    id: "a", is_retry: false, credits_reserved: 3, credits_refunded: 2,
    video_ids: ["a", "b", "c", "d", "e", "f"], use_whisper_ids: [],
    video_results: {
      a: { status: "success" }, b: { status: "success" }, c: { status: "success" },
      d: { status: "success" },
      e: { status: "error", error_type: "bot_detection" },
      f: { status: "error", error_type: "extraction_error" },
    },
  }
  const j2: ReceiptJobRow = {
    id: "b", is_retry: true, credits_reserved: 1, credits_refunded: 0,
    video_ids: ["e"], use_whisper_ids: [], video_results: { e: { status: "success" } },
  }
  const r = aggregatePlaylistReceipt([j1, j2], [settle("d", 1), settle("e", 1)], "a")
  assert.equal(r.used, 2, "d + e charged")
  assert.equal(r.refunded, 1, "only f is finally skipped (rate 1); gross per-job refund was 2")
  assert.equal(r.transcribedCount, 5)
  assert.equal(r.skippedCount, 1)
  assert.equal(r.used + r.refunded, r.reserved, "charged + not-used reconciles")
})

// ── 3. a skipped FREE-tier video contributes 0 to not-used
test("finally-skipped free-tier video (idx<3 caption) adds 0 to not-used", () => {
  const j: ReceiptJobRow = {
    id: "x", is_retry: false, credits_reserved: 0, credits_refunded: 0,
    video_ids: ["a", "b", "c"], use_whisper_ids: [],
    video_results: {
      a: { status: "success" },
      b: { status: "error", error_type: "bot_detection" },   // idx 1 → free tier
      c: { status: "success" },
    },
  }
  const r = aggregatePlaylistReceipt([j], [], "x")
  assert.equal(r.refunded, 0, "a free-tier skip costs nothing → 0 not-used")
  assert.equal(r.skippedCount, 1)
  assert.equal(r.transcribedCount, 2)
})

// ── 4. a skipped WHISPER video's not-used uses its duration rate (ceil(min))
test("finally-skipped whisper video uses ceil(duration/60) as its rate", () => {
  const j: ReceiptJobRow = {
    id: "w", is_retry: false, credits_reserved: 11, credits_refunded: 11,
    video_ids: ["w1"], use_whisper_ids: ["w1"],
    video_results: { w1: { status: "error", error_type: "timeout" } },
    video_metadata: { w1: { duration: 610 } },   // ceil(610/60) = 11
  }
  const r = aggregatePlaylistReceipt([j], [], "w")
  assert.equal(r.refunded, 11, "whisper skip = ceil(610/60)")
  assert.equal(r.skippedCount, 1)
})

// ── 5. shared fixture: the TS playlistFreeIds helper must match the Python helper.
// Both backend/test_playlist_free_slots.py and this test assert against the SAME
// expected_free in test-fixtures/playlist_free_slots.json. There is NO CI in this repo;
// ./scripts/check-playlist-free-slots.sh runs both tests and is the enforcement (per the
// CLAUDE.md verification gate) — it fails the moment the TS and Python rules diverge
// (per-method, ADR-081).
test("playlistFreeIds matches the shared cross-language fixture (per-method free slots)", () => {
  const fixturePath = fileURLToPath(new URL("../../../../test-fixtures/playlist_free_slots.json", import.meta.url))
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    rule: string
    cases: { name: string; video_ids: string[]; whisper_ids: string[]; is_retry: boolean; expected_free: string[] }[]
  }
  assert.equal(fixture.rule, "per_method", "fixture must be on the per-method rule (ADR-081)")
  for (const c of fixture.cases) {
    const got = Array.from(playlistFreeIds(c.video_ids, c.whisper_ids, c.is_retry)).sort()
    assert.deepEqual(got, [...c.expected_free].sort(), `free set diverged for case "${c.name}"`)
  }
})

console.log(`\n${passed} passed`)
