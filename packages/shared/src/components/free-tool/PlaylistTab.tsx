"use client"

import { useState, useRef, useEffect } from "react"
import { PlaylistManager, VideoStatus } from "../PlaylistManager"
import { AlertCircle, Loader2, X } from "lucide-react"
import { Button } from "../ui/button"
import { marketingHref } from "../../lib/cross-host-links"
import { useAuth } from "../../hooks/useAuth"
import { useCompletionReceipt } from "../../hooks/useCompletionReceipt"
import { useJobStatus, JobStatusRow } from "../../hooks/useJobStatus"
import { createClient } from "../../utils/supabase/client"

export interface PlaylistStats {
  playlistTitle?: string
  playlistUrl?: string
  totalSelected: number
  totalSucceeded: number
  failedBotDetection: number
  failedTimeout: number
  failedAgeRestricted: number
  failedMembersOnly: number
  failedOther: number
  processingTimeSecs: number
}

interface PlaylistTabProps {
  isAuthenticated: boolean
  onAuthRequired: () => void
  onSwitchToAudio?: () => void
  onPlaylistComplete?: (stats: PlaylistStats) => void
  onExtractingChange?: (extracting: boolean) => void
  /** Observational: fires when the tab leaves/returns to idle so the page can hide/show
      its idle Recent row. Does not touch any job state. */
  onBusyChange?: (busy: boolean) => void
}

function mapBackendStatus(res: { status: string; error_type?: string }): VideoStatus {
  if (res.status === 'success') return 'success'
  switch (res.error_type) {
    case 'bot_detection':      return 'bot_detection'
    case 'timeout':            return 'timeout'
    case 'age_restricted':     return 'age_restricted'
    case 'members_only':       return 'members_only'
    case 'youtube_restricted': return 'youtube_restricted'
    case 'no_captions':        return 'no_captions'
    case 'no_speech':          return 'no_speech'
    default:                   return 'error'
  }
}

export function PlaylistTab({ isAuthenticated, onAuthRequired, onSwitchToAudio, onPlaylistComplete, onExtractingChange, onBusyChange }: PlaylistTabProps) {
  const [error, setError] = useState<{ message: string; isCreditsError?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({})
  const [freeVideoIds, setFreeVideoIds] = useState<Set<string>>(new Set())
  const [whisperVideoIds, setWhisperVideoIds] = useState<Set<string>>(new Set())
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [resumeData, setResumeData] = useState<{ jobId: string; completed: number; total: number; title?: string } | null>(null)
  const [resumeBarActive, setResumeBarActive] = useState(false)
  // Entry list rebuilt from the DB (video_metadata) on resume so PlaylistManager
  // can re-render the per-video list; statuses come from the DB via videoStatuses.
  const [resumePlaylist, setResumePlaylist] = useState<{ title: string; entries: Array<{ id: string; title: string; duration?: number }> } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const playlistJobIdRef = useRef<string | null>(null)
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Non-null while a single-video manual retry job is running (see handleRetryVideo).
  const retryVideoIdRef = useRef<string | null>(null)
  const { credits, refreshCredits } = useAuth()

  // Active playlist job being tracked
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [completedPlaylistId, setCompletedPlaylistId] = useState<string | null>(null)  // feeds the completion receipt (RLS read)
  const [receiptNonce, setReceiptNonce] = useState(0)  // bumped on retry completion → re-fetch the collection-scoped receipt
  const playlistReceipt = useCompletionReceipt('playlist', completedPlaylistId, !!completedPlaylistId, receiptNonce)
  const fallbackMetaRef = useRef<{ title?: string; url?: string; total?: number }>({})
  const [watchdogRefundNotice, setWatchdogRefundNotice] = useState(false)

  // Tell the page when this tab is past idle (a job running, completed, or per-video
  // results on screen) so it can hide the idle Recent row. Read-only.
  const isBusy = !!activeJobId || !!completedPlaylistId || resumeBarActive || Object.keys(videoStatuses).length > 0
  useEffect(() => { onBusyChange?.(isBusy); return () => onBusyChange?.(false) }, [isBusy, onBusyChange])

  const _handlePlaylistUpdate = (job: JobStatusRow) => {
    const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string; free?: boolean }>
    const newStatuses: Record<string, VideoStatus> = {}
    for (const [vid, res] of Object.entries(vr)) {
      newStatuses[vid] = mapBackendStatus(res)
      if (res.free) setFreeVideoIds(prev => { const s = new Set(prev); s.add(vid); return s })
    }
    if (job.current_video_index != null && Array.isArray(job.video_ids)) {
      const currentVid = job.video_ids[job.current_video_index]
      if (currentVid && !vr[currentVid]) newStatuses[currentVid] = 'extracting'
    }
    setVideoStatuses(prev => ({ ...prev, ...newStatuses }))
    if (job.status === 'retry_pending') {
      setProgressMessage("Retrying failed videos...")
    } else if (job.current_video_title && job.total_videos) {
      const title = job.current_video_title as string
      setProgressMessage(
        title.startsWith('Loading video')
          ? title
          : `Extracting video ${(job.current_video_index ?? 0) + 1} of ${job.total_videos}: ${title}`
      )
    }
  }

  const _handlePlaylistComplete = (job: JobStatusRow) => {
    const isRetry = retryVideoIdRef.current !== null
    retryVideoIdRef.current = null

    const completedJid = playlistJobIdRef.current  // capture before nulling — feeds the receipt
    playlistJobIdRef.current = null
    setProgressMessage("")
    sessionStorage.removeItem('indxr-active-playlist-job')

    const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string; free?: boolean }>
    const finalStatuses: Record<string, VideoStatus> = {}
    const finalFreeIds = new Set<string>()
    for (const [vid, res] of Object.entries(vr)) {
      finalStatuses[vid] = mapBackendStatus(res)
      if (res.free) finalFreeIds.add(vid)
    }

    if (isRetry) {
      // Single-video manual retry: MERGE only this video's result so every other
      // row keeps its status from the original run. Skip onPlaylistComplete (it
      // writes a playlist_jobs analytics row) and the error banner — this was a
      // targeted one-video re-run, not a full playlist completion.
      setVideoStatuses(prev => ({ ...prev, ...finalStatuses }))
      setFreeVideoIds(prev => { const s = new Set(prev); finalFreeIds.forEach(id => s.add(id)); return s })
      window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
      refreshCredits()
      // The retry ran as a separate playlist job (same collection_id). Bump the nonce
      // so the collection-scoped receipt re-fetches and shows the true end-state
      // (retried videos now transcribed, corrected credit total) instead of the
      // frozen first-run snapshot. completedPlaylistId stays the first run — its
      // collection_id is the aggregation anchor.
      setReceiptNonce(n => n + 1)
      setTimeout(() => {
        setLoading(false)
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      }, 0)
      setActiveJobId(null)
      return
    }

    setVideoStatuses(finalStatuses)
    setFreeVideoIds(finalFreeIds)

    window.dispatchEvent(new CustomEvent('indxr-library-refresh'))

    if (job.status === 'error') {
      setError({ message: 'Something went wrong during extraction. Any successfully extracted transcripts have been saved to your library.' })
    }

    const errVids = Object.values(vr)
    const meta = fallbackMetaRef.current
    onPlaylistComplete?.({
      playlistTitle: job.playlist_title ?? meta.title,
      playlistUrl: job.playlist_url ?? meta.url,
      totalSelected: job.total_videos ?? meta.total ?? 0,
      totalSucceeded: job.completed ?? 0,
      failedBotDetection: errVids.filter(r => r.error_type === 'bot_detection').length,
      failedTimeout: errVids.filter(r => r.error_type === 'timeout').length,
      failedAgeRestricted: errVids.filter(r => r.error_type === 'age_restricted').length,
      failedMembersOnly: errVids.filter(r => r.error_type === 'members_only').length,
      failedOther: errVids.filter(r => r.status === 'error' && !['bot_detection', 'timeout', 'age_restricted', 'members_only', 'no_captions'].includes(r.error_type ?? '')).length,
      processingTimeSecs: job.processing_time_seconds ?? Math.floor((Date.now() - startTimeRef.current) / 1000),
    })

    refreshCredits()
    if (completedJid) setCompletedPlaylistId(completedJid)  // show the receipt for this run
    setTimeout(() => {
      setLoading(false)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }, 0)
    setActiveJobId(null)
  }

  useJobStatus({
    jobId: activeJobId,
    jobType: 'playlist',
    onUpdate: _handlePlaylistUpdate,
    onComplete: _handlePlaylistComplete,
    onError: _handlePlaylistComplete,
  })

  // Notify parent of extraction state changes
  useEffect(() => { onExtractingChange?.(loading) }, [loading, onExtractingChange])

  // Show the browser's native leave-page warning while a job is running
  useEffect(() => {
    if (!loading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [loading])

  // Check for a running job on mount — handles page reload / navigation away and back
  useEffect(() => {
    const raw = sessionStorage.getItem('indxr-active-playlist-job')
    if (!raw) return

    // Parse JSON format { jobId, startTime, playlistTitle }; fall back to plain string for legacy entries
    let activeJobId: string
    try {
      const parsed = JSON.parse(raw)
      activeJobId = typeof parsed === 'string' ? parsed : parsed.jobId
    } catch {
      sessionStorage.removeItem('indxr-active-playlist-job')
      return
    }

    ;(async () => {
      try {
        const resp = await fetch(`/api/playlist/jobs/${activeJobId}`)
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
            sessionStorage.removeItem('indxr-active-playlist-job')
          } else {
            // Transient error — show banner optimistically; Resume will re-poll
            let title: string | undefined
            let total = 0
            try {
              const p = JSON.parse(raw)
              title = typeof p === 'object' ? (p?.playlistTitle ?? undefined) : undefined
              total = Array.isArray(p?.videoIds) ? p.videoIds.length : 0
            } catch { /* ignore */ }
            setResumeData({ jobId: activeJobId, completed: 0, total, title })
          }
          return
        }
        const job = await resp.json()
        const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string; free?: boolean }>

        // Rebuild the per-video entry list from the DB job row (single source of
        // truth): titles/durations come from `video_metadata`, ordered by
        // `video_ids`. Statuses come from `vr` (video_results), above. No
        // sessionStorage, no thumbnails. Older jobs (started before video_metadata
        // was sent) fall back to the video id as the title so rows still render.
        const vm = (job.video_metadata ?? {}) as Record<string, { title?: string; duration?: number }>
        const jobVideoIds: string[] = Array.isArray(job.video_ids) ? job.video_ids : []
        const restoredEntries: Array<{ id: string; title: string; duration?: number }> =
          jobVideoIds.map(id => ({ id, title: vm[id]?.title || id, duration: vm[id]?.duration }))

        if (job.status === 'error' && job.error_type === 'watchdog_permanent_failure') {
          sessionStorage.removeItem('indxr-active-playlist-job')
          setWatchdogRefundNotice(true)
          return
        }

        if (job.status === 'complete' || job.status === 'error') {
          sessionStorage.removeItem('indxr-active-playlist-job')
          // Restore final statuses — PlaylistManager's allDone useEffect will fire and show the banner
          const finalStatuses: Record<string, VideoStatus> = {}
          const recoveredFreeIds = new Set<string>()
          for (const [vid, res] of Object.entries(vr)) {
            finalStatuses[vid] = mapBackendStatus(res)
            if (res.free) recoveredFreeIds.add(vid)
          }
          setVideoStatuses(finalStatuses)
          setFreeVideoIds(recoveredFreeIds)
          if (job.status === 'error') {
            setError({
              message: `Your extraction encountered an error. ${job.completed ?? 0} video${(job.completed ?? 0) !== 1 ? 's' : ''} were saved successfully.`,
            })
          }
          const errVids = Object.values(vr)
          onPlaylistComplete?.({
            playlistTitle: job.playlist_title,
            playlistUrl:   job.playlist_url,
            totalSelected: job.total_videos ?? 0,
            totalSucceeded: job.completed ?? 0,
            failedBotDetection:  errVids.filter(r => r.error_type === 'bot_detection').length,
            failedTimeout:       errVids.filter(r => r.error_type === 'timeout').length,
            failedAgeRestricted: errVids.filter(r => r.error_type === 'age_restricted').length,
            failedMembersOnly:   errVids.filter(r => r.error_type === 'members_only').length,
            failedOther:         errVids.filter(r =>
              r.status === 'error' &&
              !['bot_detection', 'timeout', 'age_restricted', 'members_only', 'no_captions'].includes(r.error_type ?? '')
            ).length,
            processingTimeSecs: job.processing_time_seconds ?? 0,
          })
          refreshCredits()
          window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
          return
        }

        if (job.status === 'running' || job.status === 'interrupted') {
          // 'interrupted' is a transient, recoverable state (watchdog re-enqueues
          // it) — treat it like 'running' on reload: show the Resume banner instead
          // of discarding the job. Resuming re-attaches the poll, which now survives
          // an interrupted status (see useJobStatus TERMINAL).
          // Build a complete status map: start all stored videoIds as 'pending',
          // then override with actual results from the job and mark the current video as 'extracting'.
          // This gives the full picture so badges update correctly once polling resumes.
          const storedVideoIds: string[] = (() => {
            try {
              const parsed = JSON.parse(raw)
              return Array.isArray(parsed?.videoIds) ? parsed.videoIds : []
            } catch { return [] }
          })()
          // Restore whisper video IDs from sessionStorage
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed?.whisperIds)) {
              setWhisperVideoIds(new Set<string>(parsed.whisperIds))
            }
          } catch { /* ignore */ }
          const restoredStatuses: Record<string, VideoStatus> = {}
          const restoredFreeIds = new Set<string>()
          storedVideoIds.forEach(id => { restoredStatuses[id] = 'pending' })
          for (const [vid, res] of Object.entries(vr)) {
            restoredStatuses[vid] = mapBackendStatus(res)
            if (res.free) restoredFreeIds.add(vid)
          }
          if (job.current_video_index != null && Array.isArray(job.video_ids)) {
            const currentVid = job.video_ids[job.current_video_index]
            if (currentVid && !vr[currentVid]) restoredStatuses[currentVid] = 'extracting'
          }
          if (Object.keys(restoredStatuses).length > 0) {
            setVideoStatuses(restoredStatuses)
            setFreeVideoIds(restoredFreeIds)
          }
          if (restoredEntries.length > 0) {
            setResumePlaylist({ title: job.playlist_title ?? 'Playlist', entries: restoredEntries })
          }
          setResumeData({
            jobId: activeJobId,
            completed: job.completed ?? 0,
            total: job.total_videos ?? 0,
            title: job.playlist_title ?? undefined,
          })
        } else if (job.status === 'retry_pending') {
          // Retry-pass is in progress — auto-resume without a banner.
          // No user action needed; the retry-pass runs automatically.
          // Restore first-pass video statuses so the UI shows what succeeded/failed so far.
          const restoredStatuses: Record<string, VideoStatus> = {}
          const restoredFreeIds = new Set<string>()
          for (const [vid, res] of Object.entries(vr)) {
            restoredStatuses[vid] = mapBackendStatus(res)
            if (res.free) restoredFreeIds.add(vid)
          }
          if (Object.keys(restoredStatuses).length > 0) {
            setVideoStatuses(restoredStatuses)
            setFreeVideoIds(restoredFreeIds)
          }
          if (restoredEntries.length > 0) {
            setResumePlaylist({ title: job.playlist_title ?? 'Playlist', entries: restoredEntries })
          }
          setProgressMessage("Retrying failed videos...")
          playlistJobIdRef.current = activeJobId
          let storedStartTime = Date.now()
          try {
            const p = JSON.parse(raw)
            if (p?.startTime) storedStartTime = p.startTime
          } catch { /* ignore */ }
          startTimeRef.current = storedStartTime
          setElapsedSeconds(Math.floor((Date.now() - storedStartTime) / 1000))
          intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
          setLoading(true)
          setActiveJobId(activeJobId)
        } else {
          // Pending or unknown state — clean up
          sessionStorage.removeItem('indxr-active-playlist-job')
        }
      } catch {
        // Network exception — keep key, show banner optimistically; Resume will re-poll
        let title: string | undefined
        let total = 0
        try {
          const p = JSON.parse(raw)
          title = typeof p === 'object' ? (p?.playlistTitle ?? undefined) : undefined
          total = Array.isArray(p?.videoIds) ? p.videoIds.length : 0
        } catch { /* ignore */ }
        setResumeData({ jobId: activeJobId, completed: 0, total, title })
      }
    })()
    // onPlaylistComplete and refreshCredits are stable in practice; captured once at mount is fine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-resume countdown: when resume banner appears, resume automatically after 5 s
  useEffect(() => {
    if (!resumeData || loading) {
      setResumeBarActive(false)
      return
    }
    setResumeBarActive(false)
    const raf = requestAnimationFrame(() => setResumeBarActive(true))
    autoResumeRef.current = setTimeout(handleResume, 5000)
    return () => {
      cancelAnimationFrame(raf)
      if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData, loading])

  // Resume a running job after page reload or tab switch
  const handleResume = () => {
    if (!resumeData) return
    const { jobId } = resumeData
    setResumeData(null)
    playlistJobIdRef.current = jobId
    setLoading(true)

    let storedStartTime = Date.now()
    try {
      const raw = sessionStorage.getItem('indxr-active-playlist-job')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.startTime) storedStartTime = parsed.startTime
      }
    } catch { /* fall back to now */ }
    startTimeRef.current = storedStartTime
    setElapsedSeconds(Math.floor((Date.now() - storedStartTime) / 1000))
    intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    setActiveJobId(jobId)
  }

  const handlePlaylistExtract = async (videoIds: string[], availabilityData?: any[], playlistTitle?: string, playlistUrl?: string) => {
    setError(null)
    setProgressMessage("Initializing...")

    // ── Pre-flight credit check ────────────────────────────────────────────
    const totalWhisperCredits = (availabilityData ?? [])
      .filter((v) => videoIds.includes(v.videoId) && v.status === 'needs_whisper')
      .reduce((sum: number, v) => sum + (v.estimatedCredits ?? 0), 0);

    if (totalWhisperCredits > 0 && credits !== null && credits < totalWhisperCredits) {
      const whisperVideoCount = (availabilityData ?? []).filter(
        (v) => videoIds.includes(v.videoId) && v.status === 'needs_whisper'
      ).length;
      const shortfall = totalWhisperCredits - credits;
      const avgCostPerVideo = totalWhisperCredits / whisperVideoCount;
      const videosToDeselect = Math.ceil(shortfall / avgCostPerVideo);
      setError({
        message: `Not enough credits. You need ${totalWhisperCredits} credits for ${whisperVideoCount} video${whisperVideoCount !== 1 ? 's' : ''} requiring AI transcription, but only have ${credits}. Deselect at least ${videosToDeselect} AI-transcribed video${videosToDeselect !== 1 ? 's' : ''} or top up to proceed.`,
        isCreditsError: true
      });
      setProgressMessage("");
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      setLoading(true)
      setElapsedSeconds(0)
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

      // Create or find collection for this playlist
      let autoCollectionId: string | undefined = undefined;
      if (playlistTitle) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existingCol } = await supabase.from('collections').select('id').eq('user_id', user.id).ilike('name', playlistTitle).limit(1).maybeSingle()
          if (existingCol) {
            autoCollectionId = existingCol.id
          } else {
            const { data: newCol } = await supabase.from('collections').insert({ user_id: user.id, name: playlistTitle }).select('id').single()
            if (newCol) autoCollectionId = newCol.id
          }
        }
      }

      // Build availabilityMap first so duplicates can be excluded from initialStatuses
      const availabilityMap = new Map<string, any>();
      if (availabilityData) {
        availabilityData.forEach(video => availabilityMap.set(video.videoId, video))
      }

      // Initialize statuses: skip duplicates entirely (they keep their "Already in library" badge),
      // mark unavailable ones, everything else starts as pending.
      const initialStatuses: Record<string, VideoStatus> = {}
      videoIds.forEach(id => {
        const av = availabilityMap.get(id)
        if (av?.duplicateId) return  // excluded — allDone check must not see these as 'pending'
        initialStatuses[id] = av?.status === 'unavailable' ? 'unavailable' : 'pending'
      })

      setVideoStatuses(initialStatuses)

      // Build use_whisper_ids from availabilityData
      const useWhisperIds = (availabilityData ?? [])
        .filter((v: any) => videoIds.includes(v.videoId) && v.status === 'needs_whisper')
        .map((v: any) => v.videoId)
      setWhisperVideoIds(new Set<string>(useWhisperIds))

      // Exclude duplicates — backend always INSERTs; videos already in the library are skipped.
      // Their existing "Already in library" badge in PlaylistManager continues to display as-is.
      const extractableIds = videoIds.filter(vid => {
        const av = availabilityMap.get(vid)
        return !av?.duplicateId
      })

      // Per-video display metadata ({video_id: {title, duration}}), persisted on
      // the DB job row so the per-video list can be rebuilt from the DB on resume
      // (single source of truth — no sessionStorage entry cache). No thumbnails:
      // the list is title-driven.
      const videoMetadata: Record<string, { title: string; duration?: number }> = {}
      for (const id of extractableIds) {
        const av = availabilityMap.get(id)
        videoMetadata[id] = { title: av?.title ?? '', duration: av?.duration }
      }

      // Start extraction job on the backend
      const response = await fetch('/api/playlist/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: extractableIds,
          collection_id: autoCollectionId ?? null,
          use_whisper_ids: useWhisperIds,
          playlist_title: playlistTitle ?? null,
          playlist_url: playlistUrl ?? null,
          video_metadata: videoMetadata,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to start playlist extraction')
      }

      const { job_id } = await response.json()
      playlistJobIdRef.current = job_id
      // sessionStorage holds only pointers/timers — the per-video entry list is
      // now sourced from the DB (video_metadata) on resume, not cached here.
      sessionStorage.setItem('indxr-active-playlist-job', JSON.stringify({
        jobId: job_id,
        startTime: Date.now(),
        playlistTitle: playlistTitle ?? null,
        videoIds: extractableIds,
        whisperIds: useWhisperIds,
      }))
      setProgressMessage(`Starting extraction of ${extractableIds.length} video${extractableIds.length !== 1 ? 's' : ''}...`)

      fallbackMetaRef.current = { title: playlistTitle, url: playlistUrl, total: extractableIds.length }
      setCompletedPlaylistId(null)  // clear any prior run's receipt
      setActiveJobId(job_id)
      refreshCredits()  // ADR-050: reflect the reservation in the topbar immediately

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to extract playlist"
      setError({ message: errorMessage })
      setLoading(false)
      setProgressMessage("")
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }

  // Manual retry: re-run failed (rate-limited/timeout) videos as ONE new playlist
  // job. A new job_id → new backend proxy session, so the retry lands on a fresh
  // Decodo exit IP instead of the one YouTube 429'd. The retry job reuses the
  // playlist's collection_id, so the completion receipt aggregates it into the
  // whole-playlist total (see useCompletionReceipt + the isRetry branch above).
  // Already-succeeded videos are untouched (they aren't in this job); their statuses
  // are preserved via the merge in _handlePlaylistComplete. `handleRetryVideo`
  // (one video) and `handleRetryAll` (all failed at once) share this path so both
  // reuse the exact same reserve/settle logic as a normal playlist — no separate
  // reserve path, no separate settlement risk.
  const _startRetryJob = async (videoIds: string[]) => {
    if (loading || videoIds.length === 0) return
    setError(null)
    const prevStatuses: Record<string, VideoStatus | undefined> = {}
    for (const vid of videoIds) prevStatuses[vid] = videoStatuses[vid]
    const whisperIds = videoIds.filter(vid => whisperVideoIds?.has(vid) ?? false)
    retryVideoIdRef.current = videoIds.join(',')  // non-null marks this as a retry
    setVideoStatuses(prev => {
      const next = { ...prev }
      for (const vid of videoIds) next[vid] = 'extracting'
      return next
    })

    try {
      setLoading(true)
      setElapsedSeconds(0)
      startTimeRef.current = Date.now()
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

      // Reuse the playlist's existing collection (found by title) so the retried
      // transcript lands in the same place — and so the receipt can aggregate it.
      let autoCollectionId: string | undefined = undefined
      const title = fallbackMetaRef.current.title
      if (title) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existingCol } = await supabase.from('collections').select('id').eq('user_id', user.id).ilike('name', title).limit(1).maybeSingle()
          if (existingCol) autoCollectionId = existingCol.id
        }
      }

      const response = await fetch('/api/playlist/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: videoIds,
          collection_id: autoCollectionId ?? null,
          use_whisper_ids: whisperIds,
          playlist_title: title ?? null,
          playlist_url: fallbackMetaRef.current.url ?? null,
          is_retry: true,  // onderdrukt de gratis-3 server-side (die is al in de originele run verbruikt)
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        // Surfaces the concurrency-cap 429 ("You have 3 jobs running…") and credit errors.
        throw new Error(err.error || 'Failed to retry')
      }

      const { job_id } = await response.json()
      playlistJobIdRef.current = job_id
      sessionStorage.setItem('indxr-active-playlist-job', JSON.stringify({
        jobId: job_id,
        startTime: Date.now(),
        playlistTitle: title ?? null,
        videoIds,
        whisperIds,
      }))
      setProgressMessage(videoIds.length === 1
        ? 'Retrying 1 video with a fresh connection...'
        : `Retrying ${videoIds.length} videos with a fresh connection...`)
      setActiveJobId(job_id)
      refreshCredits()  // ADR-050: reflect the reservation in the topbar immediately
    } catch (error: unknown) {
      retryVideoIdRef.current = null
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry'
      setError({ message: errorMessage })
      setLoading(false)
      setProgressMessage("")
      // Restore original failed statuses so the retry buttons stay available.
      setVideoStatuses(prev => {
        const next = { ...prev }
        for (const vid of videoIds) next[vid] = prevStatuses[vid] ?? 'bot_detection'
        return next
      })
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }

  const handleRetryVideo = (videoId: string) => _startRetryJob([videoId])
  const handleRetryAll = (videoIds: string[]) => _startRetryJob(videoIds)

  return (
    <div className="mt-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Watchdog permanent failure notice — credits already refunded */}
      {watchdogRefundNotice && (
        <div
          aria-live="polite"
          className="mb-6 p-4 bg-surface border border-border rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted">
              We konden deze playlist niet verwerken na meerdere pogingen. Je credits zijn teruggestort.
            </p>
          </div>
          <button
            aria-label="Sluiten"
            onClick={() => setWatchdogRefundNotice(false)}
            className="text-fg-muted hover:text-fg shrink-0 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}
      {/* Resume Banner — shown when a running job is detected on mount */}
      {resumeData && !loading && (
        <div
          aria-live="polite"
          className="mb-6 p-4 bg-accent/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent shrink-0">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">Playlist extraction in progress</p>
              <p className="text-xs text-fg-muted">
                {resumeData.title ? `"${resumeData.title}"` : 'A playlist'} is still being processed
                {resumeData.total > 0 ? ` (${resumeData.completed} / ${resumeData.total} videos done)` : ''}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            aria-label="Resume extraction (activates automatically in 5 seconds)"
            onClick={() => {
              if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
              handleResume()
            }}
            className="relative h-8 text-xs overflow-hidden shrink-0"
          >
            <span
              className="absolute inset-0 bg-white/20 origin-left"
              style={{
                transform: resumeBarActive ? 'scaleX(1)' : 'scaleX(0)',
                transition: resumeBarActive ? 'transform 5000ms linear' : 'none',
                transformOrigin: 'left',
              }}
            />
            <span className="relative">Resume</span>
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-error-subtle border border-error/20 rounded-xl flex items-center justify-between text-left animate-in shake duration-300">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-error-subtle rounded-lg text-error shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-error text-sm font-medium">{error.message}</p>
              {error.isCreditsError && (
                <a href={marketingHref('/pricing')}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Buy Credits →
                  </Button>
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-error/20 rounded-lg transition-colors text-error shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress Message */}
      {progressMessage && (
        <div className="mb-4 p-3 bg-surface-sunken border border-border rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-fg font-medium">{progressMessage}</span>
        </div>
      )}

      <PlaylistManager
        onExtract={handlePlaylistExtract}
        isExtracting={loading}
        videoStatuses={videoStatuses}
        freeVideoIds={freeVideoIds}
        whisperVideoIds={whisperVideoIds}
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
        onError={(message) => setError(message ? { message } : null)}
        onSwitchToAudio={onSwitchToAudio}
        onRetryVideo={handleRetryVideo}
        onRetryAll={handleRetryAll}
        elapsedSeconds={elapsedSeconds}
        resumePlaylist={resumePlaylist}
        receipt={playlistReceipt}
      />
    </div>
  )
}
