"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Search, Loader2, AlertCircle, X } from "lucide-react"
import { TranscriptCard, TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { toast } from "sonner"
import { validateYouTubeUrl, YouTubeUrlType } from "@/utils/youtube"
import { WhisperFallbackModal } from "@/components/free-tool/WhisperFallbackModal"
import Link from "next/link"
import posthog from "posthog-js"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import { cn } from "@/lib/utils"

interface VideoTabProps {
  onPlaylistDetected?: () => void
  onTranscriptLoaded?: (transcript: TranscriptItem[], metadata: TranscriptMetadata) => void
}

export function VideoTab({ onPlaylistDetected, onTranscriptLoaded }: VideoTabProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<{ message: string, type?: YouTubeUrlType } | null>(null)
  const [isPlaylistUrl, setIsPlaylistUrl] = useState(false)
  const [showWhisperModal, setShowWhisperModal] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [whisperMetadata, setWhisperMetadata] = useState<{ duration: number; creditsUsed: number } | null>(null)

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    
    // Detect if the URL is a playlist for the smart suggestion
    const validation = validateYouTubeUrl(newUrl, 'video')
    setIsPlaylistUrl(validation.type === 'PLAYLIST_IN_VIDEO')
    
    // Clear validation-only errors when URL changes
    if (error && ['NON_YOUTUBE', 'MALFORMED', 'PLAYLIST_IN_VIDEO'].includes(error.type || '')) {
      setError(null)
    }
  }

  const handleExtract = async (videoIdOrUrl?: string) => {
    const targetUrl = videoIdOrUrl || url
    if (!targetUrl) return

    // Perform validation before extraction
    const validation = validateYouTubeUrl(targetUrl, 'video')
    if (validation.type !== 'VALID_VIDEO') {
      let message = "Something went wrong"
      switch(validation.type) {
        case 'NON_YOUTUBE':
          message = "Please enter a valid YouTube URL (e.g., youtube.com/watch?v=...)"
          break
        case 'PLAYLIST_IN_VIDEO':
          message = "This is a playlist URL. Use the Playlist tab to extract multiple videos."
          break
        case 'MALFORMED':
          message = "This doesn't look like a valid YouTube link. Please check and try again."
          break
      }
      setError({ message, type: validation.type })
      return
    }
    
    setLoading(true)
    setTranscript(null)
    setError(null)
    
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIdOrUrl: targetUrl }),
      })
      
      const data = await response.json()
      
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to extract transcript')
      }
      
      setTranscript(data.transcript)
      setVideoTitle(data.title || "")
      setVideoUrl(data.video_url || targetUrl)

      // Track in PostHog
      posthog.capture('transcript_extracted', {
          type: 'video',
          credits_used: 0, // YouTube captions are free in this flow (non-Whisper)
          processing_method: 'youtube_captions'
      })
      
      if (data.transcript && data.transcript.length > 0) {
        toast.success("Transcript extracted & saved", {
          description: "Added to your library automatically.",
          action: {
            label: "View",
            onClick: () => window.location.href = '/dashboard/library'
          }
        })

        if (onTranscriptLoaded) {
           // Extract ID helper
           const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
           const match = (data.video_url || targetUrl).match(regExp);
           const videoId = (match && match[2].length === 11) ? match[2] : "";

           onTranscriptLoaded(data.transcript, {
             source: 'youtube',
             title: data.title,
             videoId,
             videoUrl: data.video_url || targetUrl,
             duration: data.duration || 0,
             processingMethod: 'youtube_captions'
           })
        }

      } else {
        toast.info("Video has no captions available")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"
      
      // Check if error is due to no captions available
      if (errorMessage.includes("No captions") || errorMessage.includes("captions")) {
        // Extract video ID for Whisper fallback
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
        const match = targetUrl.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : "";
        
        if (videoId) {
          setCurrentVideoId(videoId)
          setShowWhisperModal(true)
          return // Don't show error, show modal instead
        }
      }
      
      setError({ message: errorMessage })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleWhisperSuccess = async (transcript: TranscriptItem[], metadata: { videoId: string; title: string; duration: number; creditsUsed: number; source: string }) => {
    setTranscript(transcript)
    setVideoTitle(metadata.title || "")
    setVideoUrl(`https://www.youtube.com/watch?v=${metadata.videoId}`)
    setWhisperMetadata({ duration: metadata.duration, creditsUsed: metadata.creditsUsed })
    
    // Auto-save to library
    setSaveStatus('saving')
    
    if (onTranscriptLoaded) {
      try {
        await onTranscriptLoaded(transcript, {
          source: 'youtube',
          title: metadata.title,
          videoId: metadata.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${metadata.videoId}`,
          duration: metadata.duration,
          creditsUsed: metadata.creditsUsed,
          processingMethod: 'whisper_ai'
        })
        setSaveStatus('saved')
      } catch (error) {
        console.error('Failed to save Whisper transcript:', error)
        setSaveStatus('error')
      }
    }
  }

  const handleWhisperError = (errorMessage: string) => {
    setError({ message: errorMessage })
    toast.error(errorMessage)
  }

  return (
    <div className="mt-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-4 max-w-xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-3.5 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <Input 
              placeholder="https://www.youtube.com/watch?v=..." 
              className={cn(
                "pl-10 h-12 bg-background border-input text-foreground transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
            />
          </div>
          <Button 
            size="lg" 
            className="h-12 px-6 w-full sm:w-auto min-w-[120px]" 
            onClick={() => handleExtract()} 
            disabled={loading || !url}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Extracting" : "Extract"}
          </Button>
        </div>
        <div className="flex justify-between items-start px-1">
           <p className={cn("text-sm text-muted-foreground", error && "text-destructive")}>
             {error ? error.message : "Paste any YouTube video URL to extract captions"}
           </p>
        </div>
      </div>

      {/* Playlist Detection Banner */}
      {isPlaylistUrl && (
        <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-left animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground font-medium">Playlist detected</p>
              <p className="text-sm text-muted-foreground">Would you like to switch to the Playlist tab to extract multiple videos?</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPlaylistDetected}
            className="bg-background hover:bg-muted"
          >
            Switch to Playlist
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !transcript && (
          <div className="w-full max-w-4xl mx-auto mt-8">
             <CardSkeleton />
          </div>
      )}

      {/* Transcript Display */}
      {transcript !== null && transcript.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <TranscriptCard transcript={transcript} videoTitle={videoTitle} videoUrl={videoUrl} />
        </div>
      ) : !loading && !transcript && (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
          <p>Transcript results will appear here</p>
        </div>
      )}
      
      {/* No Captions Warning */}
      {transcript !== null && transcript.length === 0 && !loading && (
        <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm">
          No captions available for this video
        </div>
      )}
      
      {/* Success Banner for Whisper Transcription */}
      {saveStatus === 'saved' && whisperMetadata && (
        <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-left animate-in fade-in duration-300">
          <div className="flex-1">
            <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Transcript saved to library</p>
            <p className="text-xs text-muted-foreground">
              Used {whisperMetadata.creditsUsed} credits • {Math.round(whisperMetadata.duration / 60)} minutes
            </p>
          </div>
          <Link href="/dashboard/library">
            <Button variant="outline" size="sm" className="ml-4">
              View in Library
            </Button>
          </Link>
        </div>
      )}

      {/* Whisper Fallback Modal */}
      <WhisperFallbackModal
        open={showWhisperModal}
        onOpenChange={setShowWhisperModal}
        videoId={currentVideoId}
        videoTitle={videoTitle || "YouTube Video"}
        onSuccess={handleWhisperSuccess}
        onError={handleWhisperError}
      />
    </div>
  )
}
