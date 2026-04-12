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
    if (!transcript) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate duration from transcript
      const duration = transcript.length > 0 
        ? Math.ceil(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration)
        : 0

      // Calculate total character count for size estimation in Library
      const characterCount = transcript.reduce((acc, item) => acc + item.text.length, 0)
      
      // Prepare thumbnail URL (YouTube only)
      const thumbnailUrl = metadata.videoId 
        ? `https://img.youtube.com/vi/${metadata.videoId}/mqdefault.jpg`
        : null

      // Save to database
      let error = null
      
      if (metadata.duplicateId && metadata.duplicateAction) {
        // Handle Duplicate (Replace or Reset) — or internal placeholder reconciliation
        const updateData: Record<string, unknown> = {
          transcript: transcript,
          duration: duration,
          character_count: characterCount,
          processing_method: metadata.processingMethod || 'youtube_captions',
          updated_at: new Date().toISOString(),
        }

        // Always write thumbnail if present
        if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl
        if (metadata.creditsUsed) updateData.credits_used = metadata.creditsUsed

        if (metadata.isPlaceholder) {
          // Internal handoff: always write real title and collection back
          updateData.title = metadata.title
          if (metadata.collectionId !== undefined) updateData.collection_id = metadata.collectionId
        } else if (metadata.duplicateAction === 'reset') {
          // User-triggered full reset: overwrite title and nuke edits/summaries
          updateData.title = metadata.title
          updateData.edited_content = null
          updateData.ai_summary = null
        }
        // User-triggered 'replace': title, edited_content, ai_summary are intentionally preserved
        
        const result = await supabase
          .from('transcripts')
          .update(updateData)
          .eq('id', metadata.duplicateId)
        
        error = result.error
      } else {
        // Normal Insert
        const result = await supabase
          .from('transcripts')
          .insert({
            user_id: user.id,
            source_type: metadata.source,
            title: metadata.title,
            transcript: transcript,
            duration: duration,
            character_count: characterCount,
            thumbnail_url: thumbnailUrl,
            video_id: metadata.videoId,
            filename: metadata.filename,
            credits_used: metadata.creditsUsed,
            processing_method: metadata.processingMethod || 'youtube_captions',
            collection_id: metadata.collectionId
          })
          
        error = result.error
      }
      
      // Tell sidebar to refresh using the custom event
      if (!error) {
         window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
      }

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

  const processVideo = async (videoId: string, options?: { status?: string; duplicateId?: string; duplicateAction?: 'replace' | 'reset'; collectionId?: string; title?: string }) => {
    // Track placeholder for cleanup on failure
    let createdPlaceholderId: string | null = null;

    try {
        let response;
        const effectiveMethod = options?.status === 'needs_whisper' ? 'whisper_ai' : 'youtube_captions';

      // 1. Initial placeholder or update existing record to show "Processing" status
      let transcriptId: string;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (options?.duplicateId) {
        // Update existing record with placeholder title
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({
            title: `Processing Video ${videoId}...`,
            processing_method: effectiveMethod,
          })
          .eq('id', options.duplicateId);
          
        if (updateError) {
          console.error("Error updating early transcript record:", updateError);
          throw new Error("Failed to update transcript record.");
        }
        transcriptId = options.duplicateId;
      } else {
        // Insert new placeholder
        const { data: earlyTranscript, error: insertError } = await supabase
          .from('transcripts')
          .insert({
            user_id: user.id,
            source_type: 'youtube',
            title: `Processing Video ${videoId}...`,
            transcript: [],
            duration: 0,
            character_count: 0,
            video_id: videoId,
            processing_method: effectiveMethod,
            collection_id: options?.collectionId,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting early transcript record:", insertError);
          throw new Error("Failed to create initial transcript record.");
        }
        transcriptId = earlyTranscript.id;
        createdPlaceholderId = transcriptId; // Track for cleanup on failure
      }

        if (options?.status === 'needs_whisper') {
           const formData = new FormData();
           formData.append('source_type', 'youtube');
           formData.append('video_id', videoId);
           formData.append('transcript_id', transcriptId); // Pass the transcript ID
           
           response = await fetch('/api/transcribe/whisper', {
               method: 'POST',
               body: formData,
           });
        } else {
           // Default to caption extraction
            response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoIdOrUrl: videoId, transcriptId }), // Pass transcriptId
            })
        }
        
        const data = await response.json()
        
        if (!response.ok || data.success === false) {
            throw new Error(data.error || 'Failed to extract transcript')
        }

        // Auto-save: always update the placeholder record with real data
        await handleTranscriptLoaded(data.transcript, {
          source: 'youtube',
          // Bug 1 fix: for Whisper responses data.title is undefined — use the
          // title passed in from the playlist availability map as the fallback
          title: data.title || options?.title || `Video ${videoId}`,
          duration: 0, // Will be calculated from transcript
          videoId,
          videoUrl: data.video_url,
          processingMethod: effectiveMethod,
          duplicateId: transcriptId,
          duplicateAction: options?.duplicateAction || 'replace',
          collectionId: options?.collectionId,
          isPlaceholder: !options?.duplicateId, // True for new videos (placeholder), false for user-triggered duplicate
        })
        // Placeholder was promoted to a real transcript — don't delete it in finally
        createdPlaceholderId = null;
        
    } catch (error) {
        console.error(`Process video ${videoId} failed:`, error)
        // Re-throw with the original message so callers can detect specific errors
        // (e.g. 'no_speech_detected' from Whisper on silent videos)
        throw error
    } finally {
        // Always clean up placeholder row if we created one and it wasn't promoted to a real transcript
        if (createdPlaceholderId) {
          try {
            await supabase.from('transcripts').delete().eq('id', createdPlaceholderId);
            window.dispatchEvent(new CustomEvent('indxr-library-refresh'));
          } catch (cleanupError) {
            console.error('Failed to clean up placeholder:', cleanupError);
          }
        }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <WelcomeCreditCard claimed={isRewardClaimed} />
       <div>
         <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Transcribe</h1>
         <p className="text-[var(--text-muted)]">Extract captions from videos, playlists, or audio files.</p>
       </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-[var(--bg-elevated)] h-auto rounded-xl">
          <TabsTrigger 
            value="video" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <Video className="h-4 w-4" /> Single Video
          </TabsTrigger>
          <TabsTrigger 
            value="playlist" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <ListMusic className="h-4 w-4" /> Playlist
          </TabsTrigger>
          <TabsTrigger 
            value="audio" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <Mic className="h-4 w-4" /> Audio Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video">
          <VideoTab
            onPlaylistDetected={() => setActiveTab('playlist')}
            onTranscriptLoaded={handleTranscriptLoaded}
            onSwitchToAudio={() => setActiveTab('audio')}
          />
        </TabsContent>

        <TabsContent value="playlist">
          <PlaylistTab
            isAuthenticated={true}
            onAuthRequired={() => {}}
            onExtractVideo={processVideo}
            onSwitchToAudio={() => setActiveTab('audio')}
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
