// Unit test for the credit-history display layer. No framework — run:
//   node --experimental-strip-types packages/shared/src/lib/creditHistory.test.ts
// Verifies the core invariant (sum of visible rows == authoritative balance), grouping of the
// reserve→settle→refund steps into one net line, pending holds, and English labels without ledger jargon.
import assert from "node:assert/strict"
import { buildCreditActivity, visibleBalance, type RawCreditTx } from "./creditHistory.ts"

let passed = 0
function check(name: string, cond: boolean) {
  assert.ok(cond, name)
  passed++
}

// Helpers to build raw ledger rows the way the RPCs write them.
let seq = 0
const ts = () => `2026-09-10T00:00:${String(seq++).padStart(2, "0")}Z`
function reservation(job: string, amount: number): RawCreditTx {
  return { id: `res-${job}`, amount, type: "debit", kind: "reservation", reason: "Credit reservation", job_id: job, created_at: ts() }
}
function settlement(job: string, amount: number): RawCreditTx {
  return { id: `set-${job}-${seq}`, amount, type: "debit", kind: "settlement", reason: "AI transcriptie settlement", job_id: job, created_at: ts() }
}
function refund(job: string, reserved: number, consumed: number, total = 1, failed = 0, playlist = false): RawCreditTx {
  const refunded = reserved - consumed
  return {
    id: `ref-${job}`,
    amount: Math.abs(refunded),
    type: refunded >= 0 ? "credit" : "debit",
    kind: "refund",
    reason: `Reserved ${reserved} → used ${consumed} → ${Math.abs(refunded)} refunded (${failed}/${total} failed)`,
    job_id: playlist ? null : job,
    playlist_id: playlist ? job : null,
    metadata: { reserved, consumed, refunded, failed_count: failed, total },
    created_at: ts(),
  }
}

// 1. One finished 1-credit transcription = 3 ledger rows → ONE visible line of -1.
{
  const raw = [reservation("j1", 1), settlement("j1", 1), refund("j1", 1, 1)]
  const rows = buildCreditActivity(raw)
  check("single: collapses 3 rows to 1", rows.length === 1)
  check("single: label is clean English", rows[0].label === "AI transcription")
  check("single: amount is -1 (not -2)", rows[0].amount === -1)
  check("single: sum equals the -1 balance move", visibleBalance(rows) === -1)
  check("single: no ledger jargon in label", !/reserv|settle|refund/i.test(rows[0].label))
}

// 2. Failed transcription with full return = visible, net 0, says it was returned.
{
  const raw = [reservation("j2", 1), refund("j2", 1, 0, 1, 1)]
  const rows = buildCreditActivity(raw)
  check("failed: one row", rows.length === 1)
  check("failed: net 0", rows[0].amount === 0)
  check("failed: label mentions failed + returned", /failed/.test(rows[0].label) && /returned/.test(rows[0].label))
  check("failed: no jargon", !/reserv|settle|refund/i.test(rows[0].label))
}

// 3. Playlist, partial success.
{
  const raw = [reservation("p1", 18), settlement("p1", 15), refund("p1", 18, 15, 21, 4, true)]
  const rows = buildCreditActivity(raw)
  check("playlist: one row", rows.length === 1)
  check("playlist: amount is -consumed (-15)", rows[0].amount === -15)
  check("playlist: label has videos + used + failed", rows[0].label === "Playlist (21 videos) — 15 credits used · 4 failed")
}

// 4. Pending hold (reservation without a refund yet).
{
  const raw = [reservation("j3", 5), settlement("j3", 2)]
  const rows = buildCreditActivity(raw)
  check("pending: one row", rows.length === 1)
  check("pending: flagged pending", rows[0].pending === true)
  check("pending: shows the -5 hold", rows[0].amount === -5)
  check("pending: label says in progress", /in progress/.test(rows[0].label))
}

// 5. Standalone grants / purchases / direct debits pass through with sign.
{
  const raw: RawCreditTx[] = [
    { id: "g1", amount: 50, type: "credit", kind: "grant", reason: "Welcome Reward", created_at: ts() },
    { id: "b1", amount: 100, type: "credit", kind: "purchase", reason: "Purchased 100 Credits", created_at: ts() },
    { id: "d1", amount: 3, type: "debit", kind: null, reason: "AI Summarization", created_at: ts() },
  ]
  const rows = buildCreditActivity(raw)
  check("standalone: 3 rows", rows.length === 3)
  const g = rows.find((r) => r.id === "g1")!
  check("standalone: welcome relabelled", g.label === "Welcome credits" && g.amount === 50 && g.direction === "in")
  const d = rows.find((r) => r.id === "d1")!
  check("standalone: summary debit -3", d.label === "AI summary" && d.amount === -3)
}

// 6. THE INVARIANT on a mixed ledger: visible sum == sum of balance-MOVING raw rows == the balance.
{
  const raw: RawCreditTx[] = [
    { id: "g", amount: 50, type: "credit", kind: "grant", reason: "Welcome Reward", created_at: ts() }, // +50
    reservation("a", 1), settlement("a", 1), refund("a", 1, 1), //            -1
    reservation("b", 10), settlement("b", 7), refund("b", 10, 7, 8, 2, true), // -7
    reservation("c", 2), refund("c", 2, 0, 1, 1), //                            0 (failed, returned)
    reservation("d", 3), settlement("d", 1), //                                -3 (pending hold)
    { id: "s", amount: 100, type: "credit", kind: "purchase", reason: "Purchased 100 Credits", created_at: ts() }, // +100
  ]
  // Authoritative balance = only balance-moving rows: reservations(−), refunds(±), grants/purchases(+).
  // = 50 - 1 + 0  (a) ... compute directly:
  const balance =
    50 // grant
    + 100 // purchase
    - 1 + 0 // op a: reserve -1, refund +0
    - 10 + 3 // op b: reserve -10, refund +3
    - 2 + 2 // op c: reserve -2, refund +2
    - 3 // op d: reserve -3 (pending, no refund yet)
  const rows = buildCreditActivity(raw)
  check("invariant: visible sum equals balance", visibleBalance(rows) === balance)
  check("invariant: settlements never shown", !rows.some((r) => /settlement|verbruikt/i.test(r.label)))
  check("invariant: expected visible row count", rows.length === 6) // 2 standalone + 4 operations
}

console.log(`creditHistory.test.ts: ${passed} checks passed`)
