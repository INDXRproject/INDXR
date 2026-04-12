"use client"

import { useState, useRef, useEffect } from "react"
import { PlaylistManager, VideoStatus } from "@/components/PlaylistManager"
import { AlertCircle, X } from "lucide-react"
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
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
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

      // Initialize statuses: all pending, unavailable ones marked
      const initialStatuses: Record<string, VideoStatus> = {}
      videoIds.forEach(id => {
        initialStatuses[id] = 'pending'
      })

      const availabilityMap = new Map<string, any>();
      if (availabilityData) {
        availabilityData.forEach(video => {
          if (video.status === 'unavailable' && videoIds.includes(video.videoId)) {
            initialStatuses[video.videoId] = 'unavailable'
          }
          availabilityMap.set(video.videoId, video);
        })
      }

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
      setProgressMessage(`Starting extraction of ${extractableIds.length} video${extractableIds.length !== 1 ? 's' : ''}...`)

      // Poll for progress every 3s
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollResp = await fetch(`/api/playlist/jobs/${job_id}`)
          if (!pollResp.ok) return  // transient error — keep polling

          const job = await pollResp.json()
          const vr = (job.video_results ?? {}) as Record<string, { status: string; error_type?: string }>

          // Update per-video statuses from video_results
          const newStatuses: Record<string, VideoStatus> = {}
          for (const [vid, res] of Object.entries(vr)) {
            newStatuses[vid] = mapBackendStatus(res)
          }
          // Mark the currently-processing video as 'extracting'
          if (job.current_video_index != null && Array.isArray(job.video_ids)) {
            const currentVid = job.video_ids[job.current_video_index]
            if (currentVid && !vr[currentVid]) newStatuses[currentVid] = 'extracting'
          }
          setVideoStatuses(prev => ({ ...prev, ...newStatuses }))

          // Update progress message
          if (job.current_video_title && job.total_videos) {
            setProgressMessage(
              `Extracting video ${(job.current_video_index ?? 0) + 1} of ${job.total_videos}: ${job.current_video_title}`
            )
          }

          // Terminal states
          if (job.status === 'complete' || job.status === 'error') {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            playlistJobIdRef.current = null
            setProgressMessage("")

            // Final status pass — apply all video_results
            const finalStatuses: Record<string, VideoStatus> = {}
            for (const [vid, res] of Object.entries(vr)) {
              finalStatuses[vid] = mapBackendStatus(res)
            }
            setVideoStatuses(prev => ({ ...prev, ...finalStatuses }))

            // Refresh library sidebar
            window.dispatchEvent(new CustomEvent('indxr-library-refresh'))

            if (job.status === 'error') {
              setError({ message: 'Something went wrong during extraction. Any successfully extracted transcripts have been saved to your library.' })
            }

            // Derive PlaylistStats from job row and call completion callback
            const errVids = Object.values(vr)
            onPlaylistComplete?.({
              playlistTitle: job.playlist_title ?? playlistTitle,
              playlistUrl:   job.playlist_url  ?? playlistUrl,
              totalSelected: job.total_videos ?? videoIds.length,
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
            setLoading(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        } catch (pollErr) {
          console.error('Playlist poll error:', pollErr)
          // Non-fatal — keep polling
        }
      }, 3000)

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
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
        onError={(message) => setError(message ? { message } : null)}
        onSwitchToAudio={onSwitchToAudio}
        elapsedSeconds={elapsedSeconds}
      />
    </div>
  )
}
