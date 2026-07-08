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

interface Props {
  collapsed?: boolean
}

// Counts the user's genuinely-running jobs straight from the DB under RLS. This
// replaces the old sessionStorage approach, which kept one key per job-type and so
// collapsed two concurrent same-type jobs into a count of 1 (and lost the count on
// reload / another device).
export function ActiveJobsIndicator({ collapsed }: Props) {
  const [activeCount, setActiveCount] = useState(0)
  const [hasPlaylist, setHasPlaylist] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const freshCreated = new Date(Date.now() - 30 * 60_000).toISOString()
      const freshHeartbeat = new Date(Date.now() - 10 * 60_000).toISOString()
      const orFresh = `created_at.gt.${freshCreated},last_heartbeat_at.gt.${freshHeartbeat}`
      const [tx, pl] = await Promise.all([
        supabase.from('transcription_jobs').select('id', { count: 'exact', head: true })
          .in('status', TX_ACTIVE).or(orFresh),
        supabase.from('playlist_extraction_jobs').select('id', { count: 'exact', head: true })
          .in('status', PL_ACTIVE).or(orFresh),
      ])
      const plCount = pl.count ?? 0
      setActiveCount((tx.count ?? 0) + plCount)
      setHasPlaylist(plCount > 0)
    } catch {
      setActiveCount(0)
      setHasPlaylist(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  if (activeCount === 0) return null

  const href = hasPlaylist ? '/dashboard/transcribe?tab=playlist' : '/dashboard/transcribe'

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors",
        "text-fg-subtle hover:text-fg hover:bg-surface-elevated",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? `${activeCount} job${activeCount !== 1 ? 's' : ''} in progress` : undefined}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span className={cn("text-xs text-fg-muted", collapsed && "hidden")}>
        {activeCount} job{activeCount !== 1 ? 's' : ''} in progress
      </span>
    </Link>
  )
}
