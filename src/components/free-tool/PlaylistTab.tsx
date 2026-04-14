"use client"

import { useState, useRef, useEffect } from "react"
import { PlaylistManager, VideoStatus } from "@/components/PlaylistManager"
import { AlertCircle, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/utils/supabase/client"

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
}

function mapBackendStatus(res: { status: string; error_type?: string }): VideoStatus {
  if (res.status === 'success') return 'success'
  switch (res.error_type) {
    case 'bot_detection':      return 'bot_detection'
    case 'timeout':            return 'timeout'
    case 'age_restricted':     return 'age_restricted'
    case 'members_only':       return 'members_only'
    case 'youtube_restricted': return 'youtube_restricted'
    case 'no_speech_detected': return 'no_speech'
    default:                   return 'error'
  }
}

export function PlaylistTab({ isAuthenticated, onAuthRequired, onSwitchToAudio, onPlaylistComplete, onExtractingChange }: PlaylistTabProps) {
  const [error, setError] = useState<{ message: string; isCreditsError?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({})
  const [freeVideoIds, setFreeVideoIds] = useState<Set<string>>(new Set())
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [resumeData, setResumeData] = useState<{ jobId: string; completed: number; total: number; title?: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const playlistJobIdRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { credits, refreshCredits } = useAuth()

  // Notify parent of extraction state changes
  useEffect(() => { onExtractingChange?.(loading) }, [loading, onExtractingChange])

  // Clean up poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  // Show the browser's native leave-page warning while a job is running
  useEffect(() => {
    if (!loading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
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
          sessionStorage.removeItem('indxr-active-playlist-job')
          return
        }
        const job = await resp.json()
        const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string; free?: boolean }>

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
              !['bot_detection', 'timeout', 'age_restricted', 'members_only'].includes(r.error_type ?? '')
            ).length,
            processingTimeSecs: job.processing_time_seconds ?? 0,
          })
          refreshCredits()
          window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
          return
        }

        if (job.status === 'running') {
          // Build a complete status map: start all stored videoIds as 'pending',
          // then override with actual results from the job and mark the current video as 'extracting'.
          // This gives the full picture so badges update correctly once polling resumes.
          const storedVideoIds: string[] = (() => {
            try {
              const parsed = JSON.parse(raw)
              return Array.isArray(parsed?.videoIds) ? parsed.videoIds : []
            } catch { return [] }
          })()
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
          setResumeData({
            jobId: activeJobId,
            completed: job.completed ?? 0,
            total: job.total_videos ?? 0,
            title: job.playlist_title ?? undefined,
          })
        } else {
          // Pending or unknown state — clean up
          sessionStorage.removeItem('indxr-active-playlist-job')
        }
      } catch {
        sessionStorage.removeItem('indxr-active-playlist-job')
      }
    })()
    // onPlaylistComplete and refreshCredits are stable in practice; captured once at mount is fine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Shared polling setup — used by handlePlaylistExtract (new jobs) and handleResume (recovered jobs)
  function startPollInterval(
    jobId: string,
    fallbackTitle?: string,
    fallbackUrl?: string,
    fallbackTotal?: number,
  ) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const pollResp = await fetch(`/api/playlist/jobs/${jobId}`)
        if (!pollResp.ok) return  // transient error — keep polling

        const job = await pollResp.json()
        const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string; free?: boolean }>

        // Update per-video statuses from video_results
        const newStatuses: Record<string, VideoStatus> = {}
        for (const [vid, res] of Object.entries(vr)) {
          newStatuses[vid] = mapBackendStatus(res)
          if (res.free) setFreeVideoIds(prev => { const s = new Set(prev); s.add(vid); return s })
        }
        // Mark the currently-processing video as 'extracting'
        if (job.current_video_index != null && Array.isArray(job.video_ids)) {
          const currentVid = job.video_ids[job.current_video_index]
          if (currentVid && !vr[currentVid]) newStatuses[currentVid] = 'extracting'
        }
        setVideoStatuses(prev => ({ ...prev, ...newStatuses }))

        // Update progress message.
        // If the backend hasn't resolved the title yet (still "Loading video X of N..."),
        // show that string directly to avoid "Extracting video 3 of 6: Loading video 3 of 6..."
        if (job.current_video_title && job.total_videos) {
          const title = job.current_video_title as string
          setProgressMessage(
            title.startsWith('Loading video')
              ? title
              : `Extracting video ${(job.current_video_index ?? 0) + 1} of ${job.total_videos}: ${title}`
          )
        }

        // Terminal states
        if (job.status === 'complete' || job.status === 'error') {
          clearInterval(pollIntervalRef.current!)
          pollIntervalRef.current = null
          playlistJobIdRef.current = null
          setProgressMessage("")
          sessionStorage.removeItem('indxr-active-playlist-job')

          // Final status pass — replace entirely (no merge) so no stale 'pending'/'extracting' entries remain
          const finalOnlyStatuses: Record<string, VideoStatus> = {}
          const finalFreeIds = new Set<string>()
          for (const [vid, res] of Object.entries(vr)) {
            finalOnlyStatuses[vid] = mapBackendStatus(res)
            if (res.free) finalFreeIds.add(vid)
          }
          setVideoStatuses(finalOnlyStatuses)
          setFreeVideoIds(finalFreeIds)

          // Refresh library sidebar
          window.dispatchEvent(new CustomEvent('indxr-library-refresh'))

          if (job.status === 'error') {
            setError({ message: 'Something went wrong during extraction. Any successfully extracted transcripts have been saved to your library.' })
          }

          // Derive PlaylistStats from job row and call completion callback
          const errVids = Object.values(vr)
          onPlaylistComplete?.({
            playlistTitle: job.playlist_title ?? fallbackTitle,
            playlistUrl:   job.playlist_url  ?? fallbackUrl,
            totalSelected: job.total_videos ?? fallbackTotal ?? 0,
            totalSucceeded: job.completed ?? 0,
            failedBotDetection:  errVids.filter(r => r.error_type === 'bot_detection').length,
            failedTimeout:       errVids.filter(r => r.error_type === 'timeout').length,
            failedAgeRestricted: errVids.filter(r => r.error_type === 'age_restricted').length,
            failedMembersOnly:   errVids.filter(r => r.error_type === 'members_only').length,
            failedOther:         errVids.filter(r =>
              r.status === 'error' &&
              !['bot_detection', 'timeout', 'age_restricted', 'members_only'].includes(r.error_type ?? '')
            ).length,
            processingTimeSecs: job.processing_time_seconds
              ?? Math.floor((Date.now() - startTimeRef.current) / 1000),
          })

          refreshCredits()
          // Delay setLoading so React processes the final videoStatuses update first,
          // ensuring the allDone useEffect in PlaylistManager sees isExtracting=false
          // only after all statuses are terminal — preventing the banner race condition.
          setTimeout(() => {
            setLoading(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }, 0)
        }
      } catch (pollErr) {
        console.error('Playlist poll error:', pollErr)
        // Non-fatal — keep polling
      }
    }, 3000)
  }

  // Resume a running job after page reload or tab switch
  const handleResume = () => {
    if (!resumeData) return
    const { jobId } = resumeData
    setResumeData(null)
    playlistJobIdRef.current = jobId
    setLoading(true)

    // Restore the real job start time so the elapsed timer reflects actual job age
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
    startPollInterval(jobId)
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
        message: `Not enough credits. You need ${totalWhisperCredits} credits for ${whisperVideoCount} Whisper video${whisperVideoCount !== 1 ? 's' : ''} but only have ${credits}. Deselect at least ${videosToDeselect} Whisper video${videosToDeselect !== 1 ? 's' : ''} or top up to proceed.`,
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

      // Exclude duplicates — backend always INSERTs; videos already in the library are skipped.
      // Their existing "Already in library" badge in PlaylistManager continues to display as-is.
      const extractableIds = videoIds.filter(vid => {
        const av = availabilityMap.get(vid)
        return !av?.duplicateId
      })

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
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to start playlist extraction')
      }

      const { job_id } = await response.json()
      playlistJobIdRef.current = job_id
      sessionStorage.setItem('indxr-active-playlist-job', JSON.stringify({
        jobId: job_id,
        startTime: Date.now(),
        playlistTitle: playlistTitle ?? null,
        videoIds: extractableIds,
      }))
      setProgressMessage(`Starting extraction of ${extractableIds.length} video${extractableIds.length !== 1 ? 's' : ''}...`)

      startPollInterval(job_id, playlistTitle, playlistUrl, extractableIds.length)

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to extract playlist"
      setError({ message: errorMessage })
      setLoading(false)
      setProgressMessage("")
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    }
  }

  return (
    <div className="mt-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Resume Banner — shown when a running job is detected on mount */}
      {resumeData && !loading && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">You have an extraction in progress</p>
              {resumeData.title && (
                <p className="text-xs text-muted-foreground">Playlist: {resumeData.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {resumeData.completed} of {resumeData.total} video{resumeData.total !== 1 ? 's' : ''} processed so far
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleResume} className="h-8 text-xs">
              View Progress
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sessionStorage.removeItem('indxr-active-playlist-job')
                setResumeData(null)
              }}
              className="h-8 text-xs text-muted-foreground"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-left animate-in shake duration-300">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-destructive text-sm font-medium">{error.message}</p>
              {error.isCreditsError && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Buy Credits →
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-destructive/20 rounded-lg transition-colors text-destructive shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress Message */}
      {progressMessage && (
        <div className="mb-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-foreground font-medium">{progressMessage}</span>
        </div>
      )}

      <PlaylistManager
        onExtract={handlePlaylistExtract}
        isExtracting={loading}
        videoStatuses={videoStatuses}
        freeVideoIds={freeVideoIds}
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
        onError={(message) => setError(message ? { message } : null)}
        onSwitchToAudio={onSwitchToAudio}
        elapsedSeconds={elapsedSeconds}
      />
    </div>
  )
}
