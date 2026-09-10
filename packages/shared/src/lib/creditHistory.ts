// Credit-history DISPLAY layer — read-only. Turns the append-only ledger (credit_transactions) into
// the user-visible "Credit activity" list. It NEVER writes; it only decides what to show.
//
// Why this exists (ADR / LESSONS 2026-09-10): the ledger records every bookkeeping STEP of the
// reserve-and-settle model — a hold (kind='reservation'), each consumption (kind='settlement'), and a
// closing line (kind='refund'). Verified against the RPCs:
//   - reserve_credits:  credits = credits - reserved     → the hold MOVES the balance (−reserved)
//   - settle_credits:   inserts a row only               → settlement is RECORD-ONLY (moves 0)
//   - refund_credits:   credits = credits + (reserved−consumed) → the close MOVES the balance
// So one finished 1-credit transcription is three ledger rows whose naive sum is −2, even though the
// balance only moved −1. Showing raw rows is therefore both noisy AND wrong-looking.
//
// The rule (industry-standard credit ledger): the ledger stays append-only and complete; the user sees
// the NET result per operation, not the steps. We GROUP a reservation with its closing refund by the
// operation key (job_id / playlist_id) and collapse them to one line whose amount is the sum of that
// group's balance-MOVING rows. Settlements are dropped (they move 0, so dropping them can't change any
// total). Because every displayed number is a real balance movement, the sum of the visible rows equals
// user_credits.credits exactly — the authoritative balance. Corrections are new ledger rows, never edits.
//
// Historical rows render through the same logic: labels come from the structured `metadata` datacontract
// on the refund row (reserved/consumed/refunded/failed_count/total), so both current English rows and
// the older Dutch-worded rows read identically. Verified in prod (2026-09-10): 0 reservations and 0
// refunds lack a grouping key, and 0 refund rows lack `consumed` — only settlements (dropped) are keyless.

export interface RawCreditTx {
  id: string
  amount: number
  type: "credit" | "debit"
  reason: string
  kind?: string | null
  job_id?: string | null
  playlist_id?: string | null
  metadata?: {
    reserved?: number
    consumed?: number
    refunded?: number
    applied?: number
    failed_count?: number
    total?: number
    job_id?: string | null
    playlist_id?: string | null
  } | null
  created_at: string
}

export interface CreditActivityRow {
  id: string
  created_at: string
  label: string // English, user-facing. No ledger jargon (reservation/settlement/reserved/refunded).
  amount: number // signed NET effect on the balance: + added, − spent, 0 = failed and fully returned.
  direction: "in" | "out" | "none"
  pending: boolean // a running hold: the credits are already withheld but the job isn't finished.
}

function creditsWord(n: number): string {
  return `${n} credit${n === 1 ? "" : "s"}`
}

// Product debits/grants written directly (add_credits / deduct_credits_atomic). Reasons are already
// English product labels; only touch up the few that read awkwardly.
const REASON_LABELS: Record<string, string> = {
  "Welcome Reward": "Welcome credits",
  "AI Summarization": "AI summary",
}

function standaloneRow(r: RawCreditTx): CreditActivityRow {
  const inbound = r.type === "credit"
  return {
    id: r.id,
    created_at: r.created_at,
    label: REASON_LABELS[r.reason] ?? r.reason,
    amount: inbound ? r.amount : -r.amount,
    direction: inbound ? "in" : "out",
    pending: false,
  }
}

function opKey(r: RawCreditTx): string | null {
  return r.job_id ?? r.playlist_id ?? r.metadata?.job_id ?? r.metadata?.playlist_id ?? null
}

function pendingRow(res: RawCreditTx): CreditActivityRow {
  const isPlaylist = !!(res.playlist_id ?? res.metadata?.playlist_id)
  return {
    id: res.id,
    created_at: res.created_at,
    label: isPlaylist ? "Playlist — in progress" : "AI transcription — in progress",
    amount: -res.amount, // the hold already lowered the available balance
    direction: "out",
    pending: true,
  }
}

function postedRow(res: RawCreditTx | undefined, ref: RawCreditTx): CreditActivityRow {
  const m = ref.metadata ?? {}
  const reserved = res ? res.amount : m.reserved ?? 0
  const refundSigned = ref.type === "credit" ? ref.amount : -ref.amount
  const net = -reserved + refundSigned // = sum of the group's balance-moving rows (settlements move 0)
  const consumed = m.consumed ?? Math.max(0, reserved - (m.refunded ?? 0))
  const failed = m.failed_count ?? 0
  const total = m.total ?? 1

  let label: string
  if (total > 1) {
    label = `Playlist (${total} videos) — ${creditsWord(consumed)} used`
    if (failed > 0) label += ` · ${failed} failed`
  } else if (consumed === 0) {
    label = `AI transcription — failed, ${creditsWord(reserved)} returned`
  } else if (consumed < reserved) {
    // charged for the real duration, less than the up-front estimate
    label = `AI transcription — ${creditsWord(consumed)} used`
  } else {
    label = "AI transcription"
  }

  return {
    id: ref.id,
    created_at: ref.created_at,
    label,
    amount: net,
    direction: net > 0 ? "in" : net < 0 ? "out" : "none",
    pending: false,
  }
}

/**
 * Collapse the raw ledger into the user-visible activity list. Pure and read-only.
 * `rows` should be the user's FULL ledger (newest-first or any order) for the visible sum to equal
 * the authoritative balance; grouping needs both a reservation and its refund present.
 */
export function buildCreditActivity(rows: RawCreditTx[]): CreditActivityRow[] {
  const ops = new Map<string, { reservation?: RawCreditTx; refund?: RawCreditTx }>()
  const order: string[] = []
  const standalone: RawCreditTx[] = []

  for (const r of rows) {
    if (r.kind === "settlement") continue // record-only: never moved the balance → safe to drop
    if (r.kind === "reservation" || r.kind === "refund") {
      const key = opKey(r)
      if (!key) {
        // Defensive: no key to group by. Never in prod for reservation/refund (verified). Show raw
        // rather than silently invent a total, so the sum still reflects a real movement.
        standalone.push(r)
        continue
      }
      if (!ops.has(key)) {
        ops.set(key, {})
        order.push(key)
      }
      const op = ops.get(key)!
      if (r.kind === "reservation") op.reservation = r
      else op.refund = r
      continue
    }
    standalone.push(r) // grant, purchase, direct product debit, legacy null-kind
  }

  const out: CreditActivityRow[] = []
  for (const r of standalone) out.push(standaloneRow(r))
  for (const key of order) {
    const op = ops.get(key)!
    out.push(op.refund ? postedRow(op.reservation, op.refund) : pendingRow(op.reservation!))
  }

  // Newest first.
  out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
  return out
}

/** Sum of the visible rows' signed amounts. Must equal user_credits.credits for a full ledger. */
export function visibleBalance(rows: CreditActivityRow[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0)
}
