'use client'
import { useEffect, useState } from "react"
import { createClient } from "../utils/supabase/client"
import type { ReceiptVideo } from "../components/ui/CompletionReceipt"
import { aggregatePlaylistReceipt, type ReceiptJobRow } from "./receiptAggregation"

// ── useCompletionReceipt (ADR-050 fase 3) ───────────────────────────────────────
// Read-only assembly of the completion-receipt numbers from data the user already
// owns under RLS: the job/playlist row + credit_transactions. NEVER mutates credits,
// NEVER parses the (Dutch) refund reason string — the refund row carries structured
// metadata {reserved, consumed, refunded, ...} which we read directly. Falls back to
// the row's credits_reserved/credits_refunded + settlement sum when metadata is absent
// (e.g. the watchdog flat-refund path).
//
// Playlist retries (per-video and retry-all) run as SEPARATE playlist jobs with their
// own playlist_id but the SAME collection_id. A job-scoped read of the first run would
// freeze at its snapshot (e.g. "2 skipped — 30 refunded") and never see the retry's
// settlements. So the playlist path aggregates over collection_id: it merges every
// job in the collection (success wins per video) and sums settlements/refunds across
// all of them → the receipt shows the true end-state after retries. `refreshToken`
// bumps re-fetch when a retry completes (the anchor id doesn't change).

export interface ReceiptData {
  reserved: number | null
  used: number | null
  refunded: number
  transcribedCount: number | null
  skippedCount: number | null
  videos: ReceiptVideo[]
  loading: boolean
}

interface RefundMeta { reserved?: number; consumed?: number; refunded?: number }
type PlaylistJobRow = ReceiptJobRow & { collection_id?: string | null }
type Tx = { kind: string; amount: number; metadata: Record<string, unknown> | null }

const EMPTY: ReceiptData = {
  reserved: null, used: null, refunded: 0, transcribedCount: null, skippedCount: null, videos: [], loading: false,
}

export function useCompletionReceipt(
  jobType: "transcription" | "playlist",
  id: string | null,
  active: boolean,
  refreshToken: number = 0,
): ReceiptData {
  const [data, setData] = useState<ReceiptData>({ ...EMPTY, loading: !!(active && id) })

  useEffect(() => {
    if (!active || !id) { setData(EMPTY); return }
    let cancelled = false
    setData(d => ({ ...d, loading: true }))

    ;(async () => {
      try {
        const supabase = createClient()

        // ── Transcription (standalone / upload) — always job-scoped ──────────────
        if (jobType !== "playlist") {
          const [rowRes, txRes] = await Promise.all([
            supabase.from("transcription_jobs")
              .select("credits_reserved,credits_refunded,credits_cost")
              .eq("id", id).single(),
            supabase.from("credit_transactions").select("kind,amount,metadata").eq("job_id", id),
          ])
          if (cancelled) return
          const row = (rowRes.data ?? {}) as Record<string, unknown>
          const txs = (txRes.data ?? []) as Tx[]
          const meta = (txs.find(t => t.kind === "refund")?.metadata ?? {}) as RefundMeta
          const reserved = meta.reserved ?? (row.credits_reserved as number | null) ?? null
          const refunded = meta.refunded ?? (row.credits_refunded as number | null) ?? 0
          const used = meta.consumed ?? (row.credits_cost as number | null) ?? null
          setData({ reserved, used, refunded, transcribedCount: null, skippedCount: null, videos: [], loading: false })
          return
        }

        // ── Playlist — collection-scoped, NET-FINAL aggregation (covers retries) ──
        // Charged/not-used are derived per-video from the merged final state (see
        // receiptAggregation), NOT summed per-job — so retry churn (a video refunded in
        // round 1 then re-charged in round 2) never leaks into "not used".
        const anchorRes = await supabase.from("playlist_extraction_jobs")
          .select("id,collection_id,is_retry,credits_reserved,credits_refunded,video_ids,use_whisper_ids,video_results,video_metadata")
          .eq("id", id).single()
        if (cancelled) return
        const anchor = (anchorRes.data ?? {}) as PlaylistJobRow
        const collectionId = anchor.collection_id ?? null

        // Every job in the collection (the first run + any retry / retry-all jobs).
        // Without a collection_id we can't link retries → fall back to the anchor only.
        let jobRows: PlaylistJobRow[] = [anchor]
        if (collectionId) {
          const sibsRes = await supabase.from("playlist_extraction_jobs")
            .select("id,is_retry,credits_reserved,credits_refunded,video_ids,use_whisper_ids,video_results,video_metadata")
            .eq("collection_id", collectionId)
          if (cancelled) return
          if (sibsRes.data?.length) jobRows = sibsRes.data as PlaylistJobRow[]
        }

        const jobIds = jobRows.map(j => j.id).filter(Boolean) as string[]
        const txRes = await supabase.from("credit_transactions")
          .select("kind,amount,metadata")
          .in("playlist_id", jobIds.length ? jobIds : [id])
        if (cancelled) return
        const txs = (txRes.data ?? []) as Tx[]

        const agg = aggregatePlaylistReceipt(jobRows, txs, id)
        setData({ ...agg, loading: false })
      } catch {
        if (!cancelled) setData({ ...EMPTY, loading: false })
      }
    })()

    return () => { cancelled = true }
  }, [jobType, id, active, refreshToken])

  return data
}
