"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@indxr/shared/lib/utils"

const AUDIO_JOB_KEY  = 'indxr-active-audio-job'
const VIDEO_JOB_KEY  = 'indxr-active-video-job'
const PLAYLIST_JOB_KEY = 'indxr-active-playlist-job'

const POLL_INTERVAL_MS = 30_000

type ActiveJob = {
  type: 'audio' | 'video' | 'playlist'
  jobId: string
  label: string
}

const TERMINAL = new Set(['complete', 'error', 'interrupted'])

async function checkJobAlive(endpoint: string, jobId: string): Promise<boolean> {
  try {
    const resp = await fetch(`${endpoint}/${jobId}`)
    if (!resp.ok) return false
    const data = await resp.json()
    return !TERMINAL.has(data.status)
  } catch {
    return false
  }
}

function readActiveJobs(): ActiveJob[] {
  const jobs: ActiveJob[] = []
  try {
    const raw = sessionStorage.getItem(AUDIO_JOB_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      jobs.push({ type: 'audio', jobId: p.jobId, label: p.filename ?? 'Audio job' })
    }
  } catch { /* ignore */ }
  try {
    const raw = sessionStorage.getItem(VIDEO_JOB_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      jobs.push({ type: 'video', jobId: p.jobId, label: p.title ?? 'Video job' })
    }
  } catch { /* ignore */ }
  try {
    const raw = sessionStorage.getItem(PLAYLIST_JOB_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      jobs.push({ type: 'playlist', jobId: p.jobId, label: p.playlistTitle ?? 'Playlist job' })
    }
  } catch { /* ignore */ }
  return jobs
}

interface Props {
  collapsed?: boolean
}

export function ActiveJobsIndicator({ collapsed }: Props) {
  const [activeCount, setActiveCount] = useState(0)
  const [firstJobType, setFirstJobType] = useState<'audio' | 'video' | 'playlist' | null>(null)

  const refresh = useCallback(async () => {
    const candidates = readActiveJobs()
    if (candidates.length === 0) { setActiveCount(0); setFirstJobType(null); return }

    const results = await Promise.all(
      candidates.map(j => {
        const endpoint = j.type === 'playlist' ? '/api/playlist/jobs' : '/api/jobs'
        return checkJobAlive(endpoint, j.jobId).then(alive => {
          if (!alive) {
            const key = j.type === 'audio' ? AUDIO_JOB_KEY : j.type === 'video' ? VIDEO_JOB_KEY : PLAYLIST_JOB_KEY
            sessionStorage.removeItem(key)
          }
          return alive ? j : null
        })
      })
    )

    const alive = results.filter(Boolean) as ActiveJob[]
    setActiveCount(alive.length)
    setFirstJobType(alive[0]?.type ?? null)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  if (activeCount === 0) return null

  const href = firstJobType === 'playlist'
    ? '/dashboard/transcribe?tab=playlist'
    : firstJobType === 'audio'
    ? '/dashboard/transcribe?tab=audio'
    : '/dashboard/transcribe'

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors",
        "text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? `${activeCount} job${activeCount !== 1 ? 's' : ''} in progress` : undefined}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span className={cn("text-xs text-[var(--fg-muted)]", collapsed && "hidden")}>
        {activeCount} job{activeCount !== 1 ? 's' : ''} in progress
      </span>
    </Link>
  )
}
