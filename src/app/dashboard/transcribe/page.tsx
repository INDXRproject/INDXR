"use client"

import { useState } from "react"
import { Video, ListMusic, Mic } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoTab } from "@/components/free-tool/VideoTab"
import { PlaylistTab, PlaylistStats } from "@/components/free-tool/PlaylistTab"
import { AudioTab } from "@/components/free-tool/AudioTab"
import { createClient } from "@/utils/supabase/client"
import { TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { SaveErrorModal } from "@/components/SaveErrorModal"

import { WelcomeCreditCard } from "@/components/dashboard/WelcomeCreditCard"
import { useEffect } from "react"

export default function TranscribePage() {
  const [activeTab, setActiveTab] = useState("video")
  const [isExtracting, setIsExtracting] = useState(false)
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
        throw new Error(errorMsg)
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

  const handlePlaylistComplete = async (stats: PlaylistStats) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('playlist_jobs').insert({
        user_id: user.id,
        playlist_url: stats.playlistUrl ?? null,
        playlist_title: stats.playlistTitle ?? null,
        total_selected: stats.totalSelected,
        total_succeeded: stats.totalSucceeded,
        total_failed: stats.totalSelected - stats.totalSucceeded,
        failed_bot_detection: stats.failedBotDetection,
        failed_timeout: stats.failedTimeout,
        failed_age_restricted: stats.failedAgeRestricted,
        failed_members_only: stats.failedMembersOnly,
        failed_other: stats.failedOther,
        processing_time_seconds: stats.processingTimeSecs,
        completed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to save playlist job stats:', err)
    }
  }

  const processVideo = async (videoId: string, options?: { status?: string; duplicateId?: string; duplicateAction?: 'replace' | 'reset'; collectionId?: string; title?: string }) => {
    // Track placeholder for cleanup on failure (INSERT path)
    let createdPlaceholderId: string | null = null;
    // Track updated duplicate for title restoration on failure (UPDATE path)
    let updatedDuplicateId: string | null = null;

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
        updatedDuplicateId = options.duplicateId; // Track for title restoration on failure
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
            const errorType = data.error_type || null
            const errorMsg = data.error || 'Failed to extract transcript'
            throw new Error(errorType ? `${errorType}:${errorMsg}` : errorMsg)
        }

        // Whisper jobs return { job_id, status: "pending" } — poll until terminal state.
        // captions jobs return the transcript directly, so this block is skipped for them.
        if (data.job_id && data.status === 'pending') {
          const POLL_INTERVAL_MS = 3000
          const MAX_POLLS = 200 // 10 minutes max
          let jobDone = false

          for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
            const pollResp = await fetch(`/api/jobs/${data.job_id}`)
            if (!pollResp.ok) throw new Error('Failed to check job status')
            const job = await pollResp.json()

            if (job.status === 'complete') {
              jobDone = true
              // run_whisper_job always INSERTs its own transcript row. Delete it
              // to avoid a duplicate — we keep the frontend placeholder and update
              // it with the real data instead.
              if (job.transcript_id && job.transcript_id !== transcriptId) {
                await supabase.from('transcripts').delete().eq('id', job.transcript_id)
              }
              const transcript: typeof job.transcript = job.transcript ?? []
              const duration = transcript.length > 0
                ? Math.ceil(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration)
                : 0
              const characterCount = transcript.reduce((acc: number, item: { text: string }) => acc + item.text.length, 0)
              const { error: updateErr } = await supabase.from('transcripts').update({
                title: options?.title || `Video ${videoId}`,
                transcript,
                duration,
                character_count: characterCount,
                processing_method: effectiveMethod,
                credits_used: job.credits_used ?? null,
                updated_at: new Date().toISOString(),
              }).eq('id', transcriptId)
              if (updateErr) throw new Error(updateErr.message)
              window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
              createdPlaceholderId = null;
              updatedDuplicateId = null;
              break
            } else if (job.status === 'error') {
              throw new Error(`${job.error_type || 'extraction_error'}:${job.error_message || 'Transcription failed'}`)
            }
            // pending / downloading / transcribing / saving — keep polling
          }

          if (!jobDone) throw new Error('Transcription timed out')
        } else {
          // Captions path — backend returns transcript directly; save via unified handler
          await handleTranscriptLoaded(data.transcript, {
            source: 'youtube',
            title: data.title || options?.title || `Video ${videoId}`,
            duration: 0, // Will be calculated from transcript
            videoId,
            videoUrl: data.video_url,
            processingMethod: effectiveMethod,
            duplicateId: transcriptId,
            duplicateAction: options?.duplicateAction || 'replace',
            collectionId: options?.collectionId,
            isPlaceholder: !options?.duplicateId,
          })
          // Placeholder was promoted to a real transcript — don't delete/restore in finally
          createdPlaceholderId = null;
          updatedDuplicateId = null;
        }

    } catch (error) {
        console.error(`Process video ${videoId} failed:`, error)
        // Re-throw with the original message so callers can detect specific errors
        // (e.g. 'no_speech_detected' from Whisper on silent videos)
        throw error
    } finally {
        // INSERT path: delete orphan placeholder row
        if (createdPlaceholderId) {
          try {
            await supabase.from('transcripts').delete().eq('id', createdPlaceholderId);
            window.dispatchEvent(new CustomEvent('indxr-library-refresh'));
          } catch (cleanupError) {
            console.error('Failed to clean up placeholder:', cleanupError);
          }
        }
        // UPDATE path: restore title so the existing row isn't stuck as "Processing Video [ID]..."
        if (updatedDuplicateId) {
          try {
            await supabase.from('transcripts')
              .update({ title: options?.title || videoId })
              .eq('id', updatedDuplicateId);
            window.dispatchEvent(new CustomEvent('indxr-library-refresh'));
          } catch (cleanupError) {
            console.error('Failed to restore transcript title after failure:', cleanupError);
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

       <Tabs value={activeTab} onValueChange={(v) => { if (!isExtracting) setActiveTab(v) }} className="w-full space-y-8">
        <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-[var(--bg-elevated)] h-auto rounded-xl">
          <TabsTrigger
            value="video"
            disabled={isExtracting}
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
            disabled={isExtracting}
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mic className="h-4 w-4" /> Audio Upload
          </TabsTrigger>
        </TabsList>
        {isExtracting && (
          <p className="text-xs text-amber-500/80 text-center -mt-4">
            Extraction in progress — tab switching is disabled.
          </p>
        )}

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
            onPlaylistComplete={handlePlaylistComplete}
            onExtractingChange={setIsExtracting}
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
