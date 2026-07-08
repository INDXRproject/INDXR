'use client'
import { useEffect, useState } from "react"
import { createClient } from "../utils/supabase/client"
import type { ReceiptVideo } from "../components/ui/CompletionReceipt"

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
interface VideoResult { status?: string; error_type?: string }
interface PlaylistJobRow {
  id?: string
  collection_id?: string | null
  credits_reserved?: number | null
  credits_refunded?: number | null
  video_results?: Record<string, VideoResult> | null
  video_metadata?: Record<string, { title?: string }> | null
}
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

        // ── Playlist — collection-scoped aggregation (covers retries) ────────────
        const anchorRes = await supabase.from("playlist_extraction_jobs")
          .select("id,collection_id,credits_reserved,credits_refunded,video_results,video_metadata")
          .eq("id", id).single()
        if (cancelled) return
        const anchor = (anchorRes.data ?? {}) as PlaylistJobRow
        const collectionId = anchor.collection_id ?? null

        // Every job in the collection (the first run + any retry / retry-all jobs).
        // Without a collection_id we can't link retries → fall back to the anchor only.
        let jobRows: PlaylistJobRow[] = [anchor]
        if (collectionId) {
          const sibsRes = await supabase.from("playlist_extraction_jobs")
            .select("id,credits_reserved,credits_refunded,video_results,video_metadata")
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

        // Aggregate credit totals + merge per-video results across all collection jobs.
        let reserved = 0
        let hasReserved = false
        let refunded = 0
        const mergedResults: Record<string, VideoResult> = {}
        const mergedMeta: Record<string, { title?: string }> = {}
        for (const j of jobRows) {
          if (j.credits_reserved != null) { reserved += j.credits_reserved; hasReserved = true }
          refunded += j.credits_refunded ?? 0
          for (const [vid, r] of Object.entries(j.video_results ?? {})) {
            const cur = mergedResults[vid]
            // success wins: a retried video that later succeeds overrides the earlier error
            if (!cur || (cur.status !== "success" && r.status === "success")) mergedResults[vid] = r
          }
          for (const [vid, m] of Object.entries(j.video_metadata ?? {})) {
            if (!mergedMeta[vid]?.title && m?.title) mergedMeta[vid] = m
          }
        }

        const settlements = txs.filter(t => t.kind === "settlement")
        const used = settlements.reduce((s, t) => s + (t.amount || 0), 0)
        const chargedBy: Record<string, number> = {}
        for (const t of settlements) {
          const vid = t.metadata?.video_id as string | undefined
          if (vid) chargedBy[vid] = (chargedBy[vid] || 0) + (t.amount || 0)
        }

        const ids = Object.keys(mergedResults).length ? Object.keys(mergedResults) : Object.keys(mergedMeta)
        const videos: ReceiptVideo[] = ids.map(vid => {
          const r = mergedResults[vid] || {}
          const title = mergedMeta[vid]?.title
          if (r.status === "error") return { videoId: vid, title, state: "skipped" as const, errorType: r.error_type }
          if (chargedBy[vid] > 0) return { videoId: vid, title, state: "charged" as const, credits: chargedBy[vid] }
          return { videoId: vid, title, state: "free" as const }
        })

        setData({
          reserved: hasReserved ? reserved : null,
          used,
          refunded,
          transcribedCount: videos.filter(v => v.state !== "skipped").length,
          skippedCount: videos.filter(v => v.state === "skipped").length,
          videos,
          loading: false,
        })
      } catch {
        if (!cancelled) setData({ ...EMPTY, loading: false })
      }
    })()

    return () => { cancelled = true }
  }, [jobType, id, active, refreshToken])

  return data
}
