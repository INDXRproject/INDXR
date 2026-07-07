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

const EMPTY: ReceiptData = {
  reserved: null, used: null, refunded: 0, transcribedCount: null, skippedCount: null, videos: [], loading: false,
}

export function useCompletionReceipt(
  jobType: "transcription" | "playlist",
  id: string | null,
  active: boolean,
): ReceiptData {
  const [data, setData] = useState<ReceiptData>({ ...EMPTY, loading: !!(active && id) })

  useEffect(() => {
    if (!active || !id) { setData(EMPTY); return }
    let cancelled = false
    setData(d => ({ ...d, loading: true }))

    ;(async () => {
      try {
        const supabase = createClient()
        const isPlaylist = jobType === "playlist"
        const refCol = isPlaylist ? "playlist_id" : "job_id"

        const [rowRes, txRes] = await Promise.all([
          isPlaylist
            ? supabase.from("playlist_extraction_jobs")
                .select("credits_reserved,credits_refunded,video_results,video_metadata,completed,failed")
                .eq("id", id).single()
            : supabase.from("transcription_jobs")
                .select("credits_reserved,credits_refunded,credits_cost")
                .eq("id", id).single(),
          supabase.from("credit_transactions")
            .select("kind,amount,metadata")
            .eq(refCol, id),
        ])

        if (cancelled) return
        const row = (rowRes.data ?? {}) as Record<string, unknown>
        const txs = (txRes.data ?? []) as Array<{ kind: string; amount: number; metadata: Record<string, unknown> | null }>

        const refundRow = txs.find(t => t.kind === "refund")
        const meta = (refundRow?.metadata ?? {}) as RefundMeta
        const settlements = txs.filter(t => t.kind === "settlement")
        const settledSum = settlements.reduce((s, t) => s + (t.amount || 0), 0)

        const reserved = meta.reserved ?? (row.credits_reserved as number | null) ?? null
        const refunded = meta.refunded ?? (row.credits_refunded as number | null) ?? 0
        const used = meta.consumed
          ?? (isPlaylist ? settledSum : (row.credits_cost as number | null))
          ?? null

        let videos: ReceiptVideo[] = []
        let transcribedCount: number | null = null
        let skippedCount: number | null = null

        if (isPlaylist) {
          const results = (row.video_results ?? {}) as Record<string, VideoResult>
          const vmeta = (row.video_metadata ?? {}) as Record<string, { title?: string }>
          // per-video charged amount: settlement rows keyed by metadata.video_id
          const chargedBy: Record<string, number> = {}
          for (const t of settlements) {
            const vid = (t.metadata?.video_id as string | undefined)
            if (vid) chargedBy[vid] = (chargedBy[vid] || 0) + (t.amount || 0)
          }
          const ids = Object.keys(results).length ? Object.keys(results) : Object.keys(vmeta)
          videos = ids.map(vid => {
            const r = results[vid] || {}
            const title = vmeta[vid]?.title
            if (r.status === "error") return { videoId: vid, title, state: "skipped" as const, errorType: r.error_type }
            if (chargedBy[vid] > 0) return { videoId: vid, title, state: "charged" as const, credits: chargedBy[vid] }
            return { videoId: vid, title, state: "free" as const }
          })
          transcribedCount = (row.completed as number | null) ?? videos.filter(v => v.state !== "skipped").length
          skippedCount = (row.failed as number | null) ?? videos.filter(v => v.state === "skipped").length
        }

        setData({ reserved, used, refunded, transcribedCount, skippedCount, videos, loading: false })
      } catch {
        if (!cancelled) setData({ ...EMPTY, loading: false })
      }
    })()

    return () => { cancelled = true }
  }, [jobType, id, active])

  return data
}
