'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getPollingInterval } from '@/lib/pollingBackoff'

export interface JobStatusRow {
  status: string
  transcript?: unknown
  transcript_id?: string | null
  channel?: string | null
  language?: string | null
  duration?: number
  credits_used?: number
  processing_time_seconds?: number
  error_message?: string | null
  error_type?: string | null
  error_code?: string | null
  required_credits?: number
  available_credits?: number
  completed?: number
  failed?: number
  total_videos?: number
  video_results?: Record<string, unknown>
  current_video_index?: number | null
  current_video_title?: string | null
  playlist_title?: string | null
  playlist_url?: string | null
  video_ids?: string[]
}

interface UseJobStatusOptions {
  jobId: string | null
  jobType: 'transcription' | 'playlist'
  onUpdate: (job: JobStatusRow) => void
  onComplete: (job: JobStatusRow) => void
  onError: (job: JobStatusRow) => void
}

const TABLE = {
  transcription: 'transcription_jobs',
  playlist: 'playlist_extraction_jobs',
} as const

const ENDPOINT = {
  transcription: (id: string) => `/api/jobs/${id}`,
  playlist: (id: string) => `/api/playlist/jobs/${id}`,
} as const

const TERMINAL = new Set(['complete', 'error', 'interrupted'])
const MAX_CONSECUTIVE_ERRORS = 3

/**
 * Subscribes to a job via Supabase Realtime (primary) + polling loop (fallback).
 * Both paths share the same handlers — React state updates are idempotent.
 * A `done` guard prevents double-firing of onComplete/onError.
 * RLS on transcription_jobs and playlist_extraction_jobs (auth.uid() = user_id)
 * ensures Realtime events are scoped to the authenticated user.
 */
export function useJobStatus({ jobId, jobType, onUpdate, onComplete, onError }: UseJobStatusOptions) {
  // Always-current callback refs — avoids stale closures without re-running the effect
  const cbRef = useRef({ onUpdate, onComplete, onError })
  useLayoutEffect(() => { cbRef.current = { onUpdate, onComplete, onError } })

  useEffect(() => {
    if (!jobId) return

    let done = false
    let stopped = false

    const supabase = createClient()
    const endpoint = ENDPOINT[jobType](jobId)

    const handle = (job: JobStatusRow) => {
      if (done) return
      if (job.status === 'complete') {
        done = true
        stopped = true
        cbRef.current.onComplete(job)
      } else if (TERMINAL.has(job.status)) {
        done = true
        stopped = true
        cbRef.current.onError(job)
      } else {
        cbRef.current.onUpdate(job)
      }
    }

    const channel = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: TABLE[jobType],
        filter: `id=eq.${jobId}`,
      }, (payload) => handle(payload.new as JobStatusRow))
      .subscribe()

    ;(async () => {
      const startTime = Date.now()
      let consecutiveErrors = 0
      while (!stopped) {
        const elapsed = (Date.now() - startTime) / 1000
        await new Promise<void>(r => setTimeout(r, getPollingInterval(elapsed)))
        if (stopped) break
        try {
          const resp = await fetch(endpoint)
          if (!resp.ok) { consecutiveErrors++; continue }
          const job = await resp.json() as JobStatusRow
          consecutiveErrors = 0
          handle(job)
        } catch {
          consecutiveErrors++
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            handle({ status: 'network_error' })
            break
          }
        }
      }
    })()

    return () => {
      stopped = true
      supabase.removeChannel(channel)
    }
  }, [jobId, jobType])
}
