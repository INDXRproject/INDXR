"use client"

import { useState } from "react"
import { PlaylistManager, VideoStatus } from "@/components/PlaylistManager"
import { AlertCircle, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/utils/supabase/client"
import posthog from "posthog-js"

interface PlaylistTabProps {
  isAuthenticated: boolean
  onAuthRequired: () => void
  onExtractVideo?: (videoId: string, options?: { status?: string; duplicateId?: string; duplicateAction?: 'replace' | 'reset'; collectionId?: string; title?: string }) => Promise<void>
}

export function PlaylistTab({ isAuthenticated, onAuthRequired, onExtractVideo }: PlaylistTabProps) {
  const [error, setError] = useState<{ message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({})
  const [progressMessage, setProgressMessage] = useState<string>("")
  const { credits, refreshCredits } = useAuth()

  const handlePlaylistExtract = async (videoIds: string[], availabilityData?: any[], playlistTitle?: string) => {
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
        message: `Not enough credits. You need ${totalWhisperCredits} credits for ${whisperVideoCount} Whisper video${whisperVideoCount !== 1 ? 's' : ''} but only have ${credits}. Deselect at least ${videosToDeselect} Whisper video${videosToDeselect !== 1 ? 's' : ''} or top up to proceed.`
      });
      setProgressMessage("");
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      setLoading(true)
      
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
              const isNoSpeech = e instanceof Error && e.message === 'no_speech_detected';
              setVideoStatuses(prev => ({ ...prev, [videoId]: isNoSpeech ? 'no_speech' : 'error' }))
          }
      }
      
      
      if (successCount === videoIds.length) {
          // PlaylistManager handles the "Extraction Complete" view
          setProgressMessage(""); 
      } else {
          setProgressMessage("");
      }
      // setProgressMessage("") <- Don't clear immediately

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to extract playlist"
      setError({ message: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-left animate-in shake duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-destructive text-sm font-medium">{error.message}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
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
      />
    </div>
  )
}
