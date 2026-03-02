"use client"

import { useState } from "react"
import { PlaylistManager, VideoStatus } from "@/components/PlaylistManager"
import { AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import posthog from "posthog-js"

interface PlaylistTabProps {
  isAuthenticated: boolean
  onAuthRequired: () => void
  onExtractVideo?: (videoId: string, status?: string) => Promise<void>
}

export function PlaylistTab({ isAuthenticated, onAuthRequired, onExtractVideo }: PlaylistTabProps) {
  const [error, setError] = useState<{ message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({})
  const [progressMessage, setProgressMessage] = useState<string>("")
  const { refreshCredits } = useAuth()

  const handlePlaylistExtract = async (videoIds: string[], availabilityData?: any[]) => {
    setError(null)
    setProgressMessage("Initializing...")
    
    if (!onExtractVideo) {
         setError({ message: "Extraction function not provided" });
         return;
    }

    try {
      setLoading(true)
      
      // Initialize statuses
      const initialStatuses: Record<string, VideoStatus> = {}
      videoIds.forEach(id => {
        initialStatuses[id] = 'pending'
      })
      
      // Mark unavailable videos if availability data is present
      const statusMap = new Map<string, string>();
      if (availabilityData) {
        availabilityData.forEach(video => {
          if (video.status === 'unavailable' && videoIds.includes(video.videoId)) {
            initialStatuses[video.videoId] = 'unavailable'
          }
          // Store status for extraction routing
          statusMap.set(video.videoId, video.status);
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
              // Pass the specific status (e.g., 'needs_whisper') to the parent
              const status = statusMap.get(videoId);
              await onExtractVideo(videoId, status);
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'success' }))
              successCount++;
              
              // Track in PostHog (batch-friendly?) or per video
              posthog.capture('transcript_extracted', {
                  type: 'playlist_video',
                  credits_used: status === 'needs_whisper' ? 1 : 0, // Approximation
                  processing_method: status === 'needs_whisper' ? 'whisper_ai' : 'youtube_captions'
              })

              refreshCredits(); // Live update!
          } catch (e) {
              console.error(`Failed to extract ${videoId}:`, e);
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'error' }))
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
            <p className="text-red-400 text-sm">{error.message}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress Message */}
      {progressMessage && (
        <div className="mb-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-zinc-300 font-medium">{progressMessage}</span>
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
