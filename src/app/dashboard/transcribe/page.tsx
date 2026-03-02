"use client"

import { useState } from "react"
import { Video, ListMusic, Mic } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoTab } from "@/components/free-tool/VideoTab"
import { PlaylistTab } from "@/components/free-tool/PlaylistTab"
import { AudioTab } from "@/components/free-tool/AudioTab"
import { createClient } from "@/utils/supabase/client"
import { TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { SaveErrorModal } from "@/components/SaveErrorModal"

import { WelcomeCreditCard } from "@/components/dashboard/WelcomeCreditCard"
import { useEffect } from "react"

export default function TranscribePage() {
  const [activeTab, setActiveTab] = useState("video")
  const [showSaveError, setShowSaveError] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState("")
  const [pendingSave, setPendingSave] = useState<{ transcript: TranscriptItem[], metadata: TranscriptMetadata } | null>(null)
  
  // Reward State
  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean | null>(null) // Null = loading
  
  const supabase = createClient()

  useEffect(() => {
    async function checkReward() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data, error } = await supabase.from('profiles').select('welcome_reward_claimed').eq('id', user.id).single()
            if (error || !data) {
                setIsRewardClaimed(false)
            } else {
                setIsRewardClaimed(data.welcome_reward_claimed)
            }
        }
    }
    checkReward()
  }, [supabase])

  // Unified auto-save handler with retry logic
  const handleTranscriptLoaded = async (
    transcript: TranscriptItem[], 
    metadata: TranscriptMetadata
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate duration from transcript
      const duration = transcript.length > 0 
        ? Math.ceil(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration)
        : 0
      
      // Prepare thumbnail URL (YouTube only)
      const thumbnailUrl = metadata.videoId 
        ? `https://img.youtube.com/vi/${metadata.videoId}/mqdefault.jpg`
        : null

      // Save to database
      const { error } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          source_type: metadata.source,
          title: metadata.title,
          transcript: transcript,
          duration: duration,
          thumbnail_url: thumbnailUrl,
          video_id: metadata.videoId,
          filename: metadata.filename,
          credits_used: metadata.creditsUsed,
          processing_method: metadata.processingMethod || 'youtube_captions'
        })

      if (error) {
        const errorMsg = error.message || 'Unknown database error'
        console.error("Auto-save failed:", {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // Show error modal instead of toast
        setSaveErrorMessage(errorMsg)
        setPendingSave({ transcript, metadata })
        setShowSaveError(true)
        return
      }

      // Success - no toast, AudioTab shows persistent message
    } catch (error: unknown) {
      const errorMsg = (error as Error)?.message || 'Unknown error'
      console.error("Auto-save error:", {
        error,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      })
      
      // Show error modal
      setSaveErrorMessage(errorMsg)
      setPendingSave({ transcript, metadata })
      setShowSaveError(true)
    }
  }

  const handleRetry = () => {
    if (pendingSave) {
      handleTranscriptLoaded(pendingSave.transcript, pendingSave.metadata)
    }
  }

  const processVideo = async (videoId: string, status?: string) => {
    try {
        let response;
        let processingMethod: 'youtube_captions' | 'whisper_ai' = 'youtube_captions';

        // Choose endpoint based on status
        if (status === 'needs_whisper') {
           processingMethod = 'whisper_ai';
           const formData = new FormData();
           formData.append('source_type', 'youtube');
           formData.append('video_id', videoId);
           
           response = await fetch('/api/transcribe/whisper', {
               method: 'POST',
               body: formData,
           });
        } else {
           // Default to caption extraction
            response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoIdOrUrl: videoId }),
            })
        }
        
        const data = await response.json()
        
        if (!response.ok || data.success === false) {
            throw new Error(data.error || 'Failed to extract transcript')
        }

        // Auto-save with unified metadata
        await handleTranscriptLoaded(data.transcript, { 
          source: 'youtube',
          title: data.title || `Video ${videoId}`,
          duration: 0, // Will be calculated from transcript
          videoId, 
          videoUrl: data.video_url,
          processingMethod
        })
        
    } catch (error) {
        console.error(`Process video ${videoId} failed:`, error)
        throw error // Re-throw so PlaylistTab knows it failed
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <WelcomeCreditCard claimed={isRewardClaimed} />
       <div>
         <h1 className="text-3xl font-bold text-foreground mb-2">Transcribe</h1>
         <p className="text-muted-foreground">Extract captions from videos, playlists, or audio files.</p>
       </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-muted/30 h-auto rounded-xl">
          <TabsTrigger 
            value="video" 
            className="rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200 text-muted-foreground font-medium gap-2"
          >
            <Video className="h-4 w-4" /> Single Video
          </TabsTrigger>
          <TabsTrigger 
            value="playlist" 
            className="rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200 text-muted-foreground font-medium gap-2"
          >
            <ListMusic className="h-4 w-4" /> Playlist
          </TabsTrigger>
          <TabsTrigger 
            value="audio" 
            className="rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200 text-muted-foreground font-medium gap-2"
          >
            <Mic className="h-4 w-4" /> Audio Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video">
          <VideoTab 
            onPlaylistDetected={() => setActiveTab('playlist')} 
            onTranscriptLoaded={handleTranscriptLoaded}
          />
        </TabsContent>

        <TabsContent value="playlist">
          <PlaylistTab 
            isAuthenticated={true}
            onAuthRequired={() => {}} 
            onExtractVideo={processVideo}
          />
        </TabsContent>

        <TabsContent value="audio">
          <AudioTab onTranscriptLoaded={handleTranscriptLoaded} />
        </TabsContent>
      </Tabs>

      {/* Save Error Modal */}
      <SaveErrorModal
        open={showSaveError}
        onOpenChange={setShowSaveError}
        errorMessage={saveErrorMessage}
        onRetry={handleRetry}
      />
    </div>
  )
}
