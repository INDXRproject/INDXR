"use client"

import { useState, useRef } from "react"
import { PlaylistManager, VideoStatus } from "@/components/PlaylistManager"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/utils/supabase/client"
import posthog from "posthog-js"

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
  onExtractVideo?: (videoId: string, options?: { status?: string; duplicateId?: string; duplicateAction?: 'replace' | 'reset'; collectionId?: string; title?: string }) => Promise<void>
  onSwitchToAudio?: () => void
  onPlaylistComplete?: (stats: PlaylistStats) => void
}

export function PlaylistTab({ isAuthenticated, onAuthRequired, onExtractVideo, onSwitchToAudio, onPlaylistComplete }: PlaylistTabProps) {
  const [error, setError] = useState<{ message: string; isCreditsError?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({})
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const { credits, refreshCredits } = useAuth()

  const handlePlaylistExtract = async (videoIds: string[], availabilityData?: any[], playlistTitle?: string, playlistUrl?: string) => {
    setError(null)
    setProgressMessage("Initializing...")
    
    if (!onExtractVideo) {
         setError({ message: "Extraction function not provided" });
         return;
    }

    // ── Pre-flight credit check ────────────────────────────────────────────
    // Sum credits required for all needs_whisper videos in this extraction batch.
    const totalWhisperCredits = (availabilityData ?? [])
      .filter((v) => videoIds.includes(v.videoId) && v.status === 'needs_whisper')
      .reduce((sum: number, v) => sum + (v.estimatedCredits ?? 0), 0);

    if (totalWhisperCredits > 0 && credits !== null && credits < totalWhisperCredits) {
      const whisperVideoCount = (availabilityData ?? []).filter(
        (v) => videoIds.includes(v.videoId) && v.status === 'needs_whisper'
      ).length;
      const shortfall = totalWhisperCredits - credits;
      // Estimate how many Whisper videos to deselect to cover the shortfall
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
      
      // Initialize statuses
      const initialStatuses: Record<string, VideoStatus> = {}
      videoIds.forEach(id => {
        initialStatuses[id] = 'pending'
      })
      
      // Mark unavailable videos if availability data is present
      const availabilityMap = new Map<string, any>();
      if (availabilityData) {
        availabilityData.forEach(video => {
          if (video.status === 'unavailable' && videoIds.includes(video.videoId)) {
            initialStatuses[video.videoId] = 'unavailable'
          }
          // Store entire object for extraction routing
          availabilityMap.set(video.videoId, video);
        })
      }
      
      setVideoStatuses(initialStatuses)
      
      let successCount = 0;
      let processedCount = 0;
      // Local status tracker — React state updates are async so we can't read videoStatuses mid-loop
      const localStatuses: Record<string, VideoStatus> = { ...initialStatuses };

      for (const videoId of videoIds) {
          // Skip if already marked unavailable
          if (initialStatuses[videoId] === 'unavailable') {
              processedCount++;
              continue;
          }

          processedCount++;
          setProgressMessage(`Processing video ${processedCount}/${videoIds.length}...`)

          try {
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'extracting' }))
              const videoData = availabilityMap.get(videoId);

              await onExtractVideo(videoId, {
                 status: videoData?.status,
                 duplicateId: videoData?.duplicateId,
                 duplicateAction: videoData?.duplicateAction,
                 collectionId: autoCollectionId,
                 title: videoData?.title,
              });

              localStatuses[videoId] = 'success';
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'success' }))
              successCount++;

              const isWhisper = videoData?.status === 'needs_whisper' || videoData?.status === 'whisper_ai';

              // Track in PostHog
              posthog.capture('transcript_extracted', {
                  type: 'playlist_video',
                  credits_used: isWhisper ? videoData?.estimatedCredits || 1 : 0,
                  processing_method: isWhisper ? 'whisper_ai' : 'youtube_captions',
                  duplicate_action: videoData?.duplicateAction
              })

              refreshCredits(); // Live update!
          } catch (e) {
              console.error(`Failed to extract ${videoId}:`, e);
              const errMsg = e instanceof Error ? e.message : '';
              const errLower = errMsg.toLowerCase();

              let status: VideoStatus = 'error';
              if (errMsg === 'no_speech_detected') status = 'no_speech';
              else if (errLower.includes('members_only') || errLower.includes('members-only')) status = 'members_only';
              else if (errLower.includes('age')) status = 'age_restricted';
              else if (errLower.includes('sign in') || errLower.includes('bot')) status = 'bot_detection';
              else if (errLower.includes('timed out') || errLower.includes('timeout')) status = 'timeout';
              else if (errMsg.includes('152') || errLower.includes('unavailable')) status = 'youtube_restricted';

              localStatuses[videoId] = status;
              setVideoStatuses(prev => ({ ...prev, [videoId]: status }))
          }
      }

      // Retry videos that were blocked by bot detection or timed out — wait 30s then retry once
      const retryIds = videoIds.filter(id => localStatuses[id] === 'bot_detection' || localStatuses[id] === 'timeout');

      if (retryIds.length > 0) {
          setProgressMessage(`Retrying ${retryIds.length} temporarily blocked video${retryIds.length !== 1 ? 's' : ''}... (waiting 30s)`);
          await new Promise(resolve => setTimeout(resolve, 30000));

          for (const videoId of retryIds) {
              setProgressMessage(`Retrying ${videoId}...`);
              try {
                  setVideoStatuses(prev => ({ ...prev, [videoId]: 'extracting' }))
                  const videoData = availabilityMap.get(videoId);
                  await onExtractVideo(videoId, {
                      status: videoData?.status,
                      duplicateId: videoData?.duplicateId,
                      duplicateAction: videoData?.duplicateAction,
                      collectionId: autoCollectionId,
                      title: videoData?.title,
                  });
                  setVideoStatuses(prev => ({ ...prev, [videoId]: 'success' }))
                  successCount++;
                  refreshCredits();
              } catch (e) {
                  console.error(`Retry failed for ${videoId}:`, e);
                  const errMsg = e instanceof Error ? e.message : '';
                  const errLower = errMsg.toLowerCase();
                  let status: VideoStatus = 'error';
                  if (errMsg === 'no_speech_detected') status = 'no_speech';
                  else if (errLower.includes('members_only') || errLower.includes('members-only')) status = 'members_only';
                  else if (errLower.includes('age')) status = 'age_restricted';
                  else if (errLower.includes('sign in') || errLower.includes('bot')) status = 'bot_detection';
                  else if (errLower.includes('timed out') || errLower.includes('timeout')) status = 'timeout';
                  else if (errMsg.includes('152') || errLower.includes('unavailable')) status = 'youtube_restricted';
                  setVideoStatuses(prev => ({ ...prev, [videoId]: status }))
              }
          }
      }

      onPlaylistComplete?.({
        playlistTitle,
        playlistUrl,
        totalSelected: videoIds.length,
        totalSucceeded: successCount,
        failedBotDetection: Object.values(localStatuses).filter(s => s === 'bot_detection').length,
        failedTimeout: Object.values(localStatuses).filter(s => s === 'timeout').length,
        failedAgeRestricted: Object.values(localStatuses).filter(s => s === 'age_restricted').length,
        failedMembersOnly: Object.values(localStatuses).filter(s => s === 'members_only').length,
        failedOther: Object.values(localStatuses).filter(s => s === 'error' || s === 'no_speech' || s === 'youtube_restricted').length,
        processingTimeSecs: Math.floor((Date.now() - startTimeRef.current) / 1000),
      })

      setProgressMessage("");

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to extract playlist"
      setError({ message: errorMessage })
    } finally {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setLoading(false)
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
