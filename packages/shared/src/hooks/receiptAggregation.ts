import type { ReceiptVideo } from "../components/ui/CompletionReceipt"

// ── Playlist receipt aggregation (ADR-050 fase 3, net-final fix) ─────────────────
// Pure, side-effect-free assembly of the four receipt numbers from the collection's
// jobs + credit_transactions. NEVER moves money — display only. Kept framework-free so
// it is unit-testable (node --experimental-strip-types receiptAggregation.test.ts).
//
// Principle: ONE honest end-state after retries — no per-round bookkeeping, no gross
// churn. A playlist retry runs as a SEPARATE job (own playlist_id, same collection_id),
// so summing per-job credits_refunded double-counts the reserve→refund→re-reserve churn
// (a video refunded in round 1 then re-charged in round 2 would inflate "not used").
// Fix: derive every number from the MERGED per-video FINAL state:
//   used     = Σ per-video settlements of videos that finally succeeded (each settles once)
//   not-used = Σ would-be credits of videos that were finally skipped (0 if free-tier)
// so charged + not-used reconciles with transcribed + skipped, and "N not used" == the
// skipped videos' rate. Mirrors the backend per-video cost (calculate_credit_cost +
// first-3-free) — see main.py _compute_playlist_reservation / worker.py is_free.

export interface ReceiptJobRow {
  id?: string
  is_retry?: boolean | null
  credits_reserved?: number | null
  credits_refunded?: number | null
  video_ids?: string[] | null
  use_whisper_ids?: string[] | null
  video_results?: Record<string, { status?: string; error_type?: string }> | null
  video_metadata?: Record<string, { title?: string; duration?: number }> | null
}
export interface ReceiptTx { kind: string; amount: number; metadata: Record<string, unknown> | null }
export interface AggregatedReceipt {
  reserved: number
  used: number
  refunded: number
  transcribedCount: number
  skippedCount: number
  videos: ReceiptVideo[]
}

// Mirror of calculate_credit_cost (backend): 1 credit = 1 minute, ceil, minimum 1.
function whisperRate(durationSeconds?: number): number {
  const d = durationSeconds && durationSeconds > 0 ? durationSeconds : 0
  return Math.max(1, Math.ceil(d / 60))
}

export function aggregatePlaylistReceipt(
  jobRows: ReceiptJobRow[],
  txs: ReceiptTx[],
  anchorId: string | null,
): AggregatedReceipt {
  // 1. Merge per-video final state (success wins over a later retry) + metadata + whisper set.
  const mergedResults: Record<string, { status?: string; error_type?: string }> = {}
  const mergedMeta: Record<string, { title?: string; duration?: number }> = {}
  const whisperSet = new Set<string>()
  for (const j of jobRows) {
    for (const w of j.use_whisper_ids ?? []) whisperSet.add(w)
    for (const [vid, r] of Object.entries(j.video_results ?? {})) {
      const cur = mergedResults[vid]
      if (!cur || (cur.status !== "success" && r.status === "success")) mergedResults[vid] = r
    }
    for (const [vid, m] of Object.entries(j.video_metadata ?? {})) {
      if (m?.title && !mergedMeta[vid]?.title) mergedMeta[vid] = { ...mergedMeta[vid], title: m.title }
      if (m?.duration != null && mergedMeta[vid]?.duration == null) mergedMeta[vid] = { ...mergedMeta[vid], duration: m.duration }
    }
  }

  // 2. Free-tier slots come from the ORIGINAL (non-retry) run only — the first 3 caption
  //    videos by index. Retry jobs never re-grant the free tier (is_retry). Mirrors the
  //    backend reservation rule (main.py: idx < 3 caption is free; whisper never free).
  const anchor = jobRows.find(j => j.id === anchorId) ?? jobRows.find(j => !j.is_retry) ?? jobRows[0]
  const freeIds = new Set<string>((anchor?.video_ids ?? []).slice(0, 3).filter(v => !whisperSet.has(v)))

  // 3. Per-video net charge — a video settles exactly once (on its final success).
  const chargedBy: Record<string, number> = {}
  for (const t of txs) {
    if (t.kind !== "settlement") continue
    const vid = t.metadata?.video_id as string | undefined
    if (vid) chargedBy[vid] = (chargedBy[vid] || 0) + (t.amount || 0)
  }

  // 4. Would-be per-video cost (mirror backend per-video rate + free-tier).
  const rateOf = (vid: string): number =>
    whisperSet.has(vid) ? whisperRate(mergedMeta[vid]?.duration) : (freeIds.has(vid) ? 0 : 1)

  const ids = Object.keys(mergedResults).length ? Object.keys(mergedResults) : Object.keys(mergedMeta)
  const videos: ReceiptVideo[] = []
  let used = 0
  let notUsed = 0
  for (const vid of ids) {
    const r = mergedResults[vid] || {}
    const title = mergedMeta[vid]?.title
    if (r.status === "error") {
      // Finally skipped: the credits it WOULD have cost are the honest "not used" amount
      // (0 for a free-tier video). Round-1 refunds of videos later re-charged never count.
      notUsed += rateOf(vid)
      videos.push({ videoId: vid, title, state: "skipped", errorType: r.error_type })
    } else if ((chargedBy[vid] || 0) > 0) {
      used += chargedBy[vid]
      videos.push({ videoId: vid, title, state: "charged", credits: chargedBy[vid] })
    } else {
      videos.push({ videoId: vid, title, state: "free" })
    }
  }

  return {
    reserved: used + notUsed,        // clean single-run-equivalent (no retry churn); not shown for playlist
    used,
    refunded: notUsed,
    transcribedCount: videos.filter(v => v.state !== "skipped").length,
    skippedCount: videos.filter(v => v.state === "skipped").length,
    videos,
  }
}
