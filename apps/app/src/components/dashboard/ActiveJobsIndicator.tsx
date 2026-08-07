"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@indxr/shared/lib/utils"
import { createClient } from "@indxr/shared/utils/supabase/client"

const POLL_INTERVAL_MS = 30_000

// Non-terminal statuses per table (mirrors the backend concurrency-cap / dedup
// filter — keep in sync, see LESSONS "active-job filter"). "Fresh" = created in the
// last 30m OR a heartbeat in the last 10m, which excludes zombie/stale jobs (e.g.
// the April crashes) exactly like the dedup query in main.py.
const TX_ACTIVE = ['pending', 'downloading', 'transcribing', 'saving']
const PL_ACTIVE = ['running', 'retry_pending']

const VISIBLE_JOB_KEY: Record<string, string> = {
  video: 'indxr-active-video-job',
  audio: 'indxr-active-audio-job',
  playlist: 'indxr-active-playlist-job',
}

interface Props {
  collapsed?: boolean
  // On the transcribe page the workbench already shows the running job's progress card, so the
  // pill for THAT job is a duplicate. With excludeVisible, the job in the current ?mode= (from its
  // sessionStorage key) is subtracted; the pill only remains for a genuinely OTHER background job,
  // with wording that says so (ADR-080). Elsewhere (sidebar) it counts everything.
  excludeVisible?: boolean
}

// Counts the user's genuinely-running jobs straight from the DB under RLS. This
// replaces the old sessionStorage approach, which kept one key per job-type and so
// collapsed two concurrent same-type jobs into a count of 1 (and lost the count on
// reload / another device).
export function ActiveJobsIndicator({ collapsed, excludeVisible }: Props) {
  const [activeCount, setActiveCount] = useState(0)
  const [hasPlaylist, setHasPlaylist] = useState(false)
  const [excludedVisible, setExcludedVisible] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const freshCreated = new Date(Date.now() - 30 * 60_000).toISOString()
      const freshHeartbeat = new Date(Date.now() - 10 * 60_000).toISOString()
      const orFresh = `created_at.gt.${freshCreated},last_heartbeat_at.gt.${freshHeartbeat}`
      const [tx, pl] = await Promise.all([
        // Exclude playlist child jobs: each AI video inside a playlist spawns its own
        // transcription_jobs row with playlist_id set (worker.py) — counting those makes the pill
        // flicker "1 other job" per AI video. Standalone single/upload jobs leave playlist_id null.
        // ADR-090: sluit ai_summary-achtergrondtaken uit — die hebben hun eigen in-component polling
        // en horen niet in de transcriptie-badge.
        supabase.from('transcription_jobs').select('id').is('playlist_id', null)
          .neq('source_kind', 'ai_summary')
          .in('status', TX_ACTIVE).or(orFresh),
        supabase.from('playlist_extraction_jobs').select('id')
          .in('status', PL_ACTIVE).or(orFresh),
      ])
      let txIds = (tx.data ?? []).map((r) => r.id as string)
      let plIds = (pl.data ?? []).map((r) => r.id as string)

      // Subtract the job the workbench is currently showing (the visible mode's session key).
      let excluded = false
      if (excludeVisible && typeof window !== 'undefined') {
        const mode = new URLSearchParams(window.location.search).get('mode') || 'video'
        const key = VISIBLE_JOB_KEY[mode] ?? VISIBLE_JOB_KEY.video
        let visibleId: string | null = null
        try {
          const raw = sessionStorage.getItem(key)
          if (raw) visibleId = (JSON.parse(raw)?.jobId as string) ?? null
        } catch { /* ignore malformed key */ }
        if (visibleId) {
          const before = txIds.length + plIds.length
          txIds = txIds.filter((id) => id !== visibleId)
          plIds = plIds.filter((id) => id !== visibleId)
          excluded = txIds.length + plIds.length !== before
        }
      }

      setActiveCount(txIds.length + plIds.length)
      setHasPlaylist(plIds.length > 0)
      setExcludedVisible(excluded)
    } catch {
      setActiveCount(0)
      setHasPlaylist(false)
      setExcludedVisible(false)
    }
  }, [excludeVisible])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  if (activeCount === 0) return null

  const label = excludedVisible
    ? `${activeCount} other job${activeCount !== 1 ? 's' : ''} in the background`
    : `${activeCount} job${activeCount !== 1 ? 's' : ''} in progress`
  const href = hasPlaylist ? '/dashboard/transcribe?mode=playlist' : '/dashboard/transcribe'

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors",
        "text-fg-subtle hover:text-fg hover:bg-surface-elevated",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span className={cn("text-xs text-fg-muted", collapsed && "hidden")}>
        {label}
      </span>
    </Link>
  )
}
