"use client"

import { useState } from "react"
import { TranscribeWorkbench } from "@indxr/shared/components/transcribe/TranscribeWorkbench"
import { VideoTab } from "@indxr/shared/components/free-tool/VideoTab"
import { PlaylistTab, PlaylistStats } from "@indxr/shared/components/free-tool/PlaylistTab"
import { AudioTab } from "@indxr/shared/components/free-tool/AudioTab"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { TranscriptItem } from "@indxr/shared/components/TranscriptCard"
import { TranscriptMetadata } from "@indxr/shared/types/transcript"
import { SaveErrorModal } from "@/components/SaveErrorModal"
import { ActiveJobsIndicator } from "@/components/dashboard/ActiveJobsIndicator"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

export default function TranscribePage() {
  const [isExtracting, setIsExtracting] = useState(false)
  const [showSaveError, setShowSaveError] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState("")
  const [pendingSave, setPendingSave] = useState<{ transcript: TranscriptItem[], metadata: TranscriptMetadata } | null>(null)
  const [storageFull, setStorageFull] = useState(false)

  const supabase = createClient()


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
          updateData.edited_content_updated_at = null // edit cleared → no stale-summary notice (ADR-085)
          updateData.ai_summary = null
        }
        // User-triggered 'replace': title, edited_content, ai_summary are intentionally preserved
        
        const result = await supabase
          .from('transcripts')
          .update(updateData)
          .eq('id', metadata.duplicateId)
        
        error = result.error
      } else {
        // Storage limit — block a NEW transcript when the library is at/over the cap. This is the
        // free caption path; the paid paths (AI transcription, upload, playlist) are already blocked
        // server-side before reservation. Editing/replacing an existing transcript (the update branch
        // above) is never blocked, and no credits are involved here.
        const { data: full } = await supabase.rpc('library_storage_is_full', { p_user_id: user.id })
        if (full) {
          setStorageFull(true)
          return
        }

        // Normal Insert
        const insertPayload: Record<string, unknown> = {
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
            collection_id: metadata.collectionId,
          }
          if (metadata.channel) insertPayload.channel = metadata.channel
          if (metadata.language) insertPayload.language = metadata.language
          const result = await supabase
          .from('transcripts')
          .insert(insertPayload)
          
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
                credits_used: job.credits_cost ?? null,
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
    <div className="mx-auto w-full max-w-[640px] space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">Transcribe</h1>
        <p className="mt-2 text-fg-muted">Turn a YouTube video, a playlist, or an uploaded file into a transcript.</p>
      </div>

      <ActiveJobsIndicator excludeVisible />

      {storageFull && (
        <div className="rounded-xl border border-error/20 bg-error-subtle px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-error-fg dark:text-error">Your library is full — this transcript wasn&apos;t saved.</p>
            <p className="text-sm text-fg-subtle mt-1">
              You can still copy or export it above. To save new transcripts, delete some from your{" "}
              <a href="/dashboard/library" className="text-accent hover:underline">library</a>, or buy more space on your{" "}
              <a href="/dashboard/account" className="text-accent hover:underline">account page</a>. Your existing transcripts are safe.
            </p>
          </div>
          <button onClick={() => setStorageFull(false)} className="text-fg-muted hover:text-fg shrink-0 text-xs leading-none" aria-label="Dismiss">✕</button>
        </div>
      )}

      <TranscribeWorkbench
        renderVideo={({ switchMode }) => (
          <VideoTab
            onPlaylistDetected={() => switchMode('playlist')}
            onTranscriptLoaded={handleTranscriptLoaded}
            onSwitchToAudio={() => switchMode('audio')}
          />
        )}
        renderPlaylist={({ switchMode }) => (
          <PlaylistTab
            isAuthenticated={true}
            onAuthRequired={() => {}}
            onSwitchToAudio={() => switchMode('audio')}
            onPlaylistComplete={handlePlaylistComplete}
            onExtractingChange={setIsExtracting}
          />
        )}
        renderAudio={() => (
          <AudioTab onTranscriptLoaded={handleTranscriptLoaded} />
        )}
      />

      {/* Quiet docs link under the card (idle = just the card and this link, ADR-080) */}
      <p className="text-center text-sm text-fg-muted">
        <a href={marketingHref('/docs')} target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors">
          Learn how transcription works →
        </a>
      </p>

      <SaveErrorModal
        open={showSaveError}
        onOpenChange={setShowSaveError}
        errorMessage={saveErrorMessage}
        onRetry={handleRetry}
      />
    </div>
  )
}
