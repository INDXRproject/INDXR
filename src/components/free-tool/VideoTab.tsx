"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useRef } from "react"
import { Search, Loader2, AlertCircle, Sparkles, Mic } from "lucide-react"
import { TranscriptCard, TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { toast } from "sonner"
import { validateYouTubeUrl, YouTubeUrlType } from "@/utils/youtube"
import { WhisperFallbackModal } from "@/components/free-tool/WhisperFallbackModal"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import posthog from "posthog-js"

interface VideoTabProps {
  onPlaylistDetected?: () => void
  onTranscriptLoaded?: (transcript: TranscriptItem[], metadata: TranscriptMetadata) => void
  onSwitchToAudio?: () => void
}

type WhisperStatus = 'idle' | 'pending' | 'downloading' | 'transcribing' | 'saving'

type WhisperCompleteEvent = {
  type: 'complete'
  transcript: TranscriptItem[]
  duration: number
  credits_used: number
}

type WhisperErrorEvent = {
  type: 'error'
  error: string
  code?: string
  required_credits?: number
  available_credits?: number
}

type WhisperFinalEvent = WhisperCompleteEvent | WhisperErrorEvent

/**
 * Polls GET /api/jobs/{jobId} every 3 seconds until the job reaches
 * a terminal state (complete or error). Calls onStatus for each
 * in-progress status update.
 */
async function pollWhisperJob(
  jobId: string,
  onStatus: (status: 'pending' | 'downloading' | 'transcribing' | 'saving') => void
): Promise<WhisperFinalEvent> {
  const POLL_INTERVAL_MS = 3000
  const MAX_POLLS = 200 // 10 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    let job: {
      status: string
      transcript?: TranscriptItem[]
      duration?: number
      credits_used?: number
      error_message?: string
      error_code?: string
      required_credits?: number
      available_credits?: number
    }
    try {
      const resp = await fetch(`/api/jobs/${jobId}`)
      if (!resp.ok) {
        return { type: 'error', error: 'Failed to check job status' }
      }
      job = await resp.json()
    } catch {
      return { type: 'error', error: 'Network error while checking job status' }
    }

    if (job.status === 'pending' || job.status === 'downloading' ||
        job.status === 'transcribing' || job.status === 'saving') {
      onStatus(job.status as 'pending' | 'downloading' | 'transcribing' | 'saving')
    } else if (job.status === 'complete') {
      return {
        type: 'complete',
        transcript: job.transcript!,
        duration: job.duration!,
        credits_used: job.credits_used!,
      }
    } else if (job.status === 'error') {
      return {
        type: 'error',
        error: job.error_message || 'Transcription failed',
        code: job.error_code,
        required_credits: job.required_credits,
        available_credits: job.available_credits,
      }
    }
  }

  return { type: 'error', error: 'Transcription timed out', code: 'timeout' }
}

function getWhisperProcessingEstimate(durationSeconds: number): string {
  const minutes = durationSeconds / 60
  if (minutes < 10) return "~1 min"
  if (minutes < 30) return "~2-3 min"
  if (minutes < 60) return "~4-5 min"
  if (minutes < 120) return "~6-8 min"
  return "~10+ min"
}

export function VideoTab({ onPlaylistDetected, onTranscriptLoaded, onSwitchToAudio }: VideoTabProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<{ message: string, type?: YouTubeUrlType, isYouTubeRestricted?: boolean, isCreditsError?: boolean, isMembersOnly?: boolean } | null>(null)
  const [isPlaylistUrl, setIsPlaylistUrl] = useState(false)
  const [showWhisperModal, setShowWhisperModal] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [whisperMetadata, setWhisperMetadata] = useState<{ duration: number; creditsUsed: number } | null>(null)
  const [lastProcessingMethod, setLastProcessingMethod] = useState<'youtube_captions' | 'whisper_ai' | null>(null)
  const [isReextracting, setIsReextracting] = useState(false)
  const { user, credits, refreshCredits } = useAuth()

  // Whisper confirmation step state
  const [showWhisperConfirm, setShowWhisperConfirm] = useState(false)
  const [pendingWhisperData, setPendingWhisperData] = useState<{
    videoId: string
    duration: number
    title: string
    creditsRequired: number
  } | null>(null)

  // Whisper toggle state
  const [useWhisper, setUseWhisper] = useState(false)
  // Track if Whisper was triggered automatically (no captions available)
  const [whisperAutoTriggered, setWhisperAutoTriggered] = useState(false)

  // SSE streaming state
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>('idle')
  const [isStreaming, setIsStreaming] = useState(false)
  // True while fetching video metadata for Whisper cost estimation
  const [isFetchingMeta, setIsFetchingMeta] = useState(false)

  // Navigation guard while SSE stream is open
  useEffect(() => {
    if (!isStreaming) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStreaming]);

  // Add navigation guard during extraction
  useEffect(() => {
    if (!isReextracting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isReextracting]);

  const [existingTranscriptId, setExistingTranscriptId] = useState<string | null>(null)
  const [existingTranscriptMethod, setExistingTranscriptMethod] = useState<string | null>(null)
  const [showDuplicateChoices, setShowDuplicateChoices] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  // In-memory set tracking "videoId:processingMethod" keys saved in this page session
  const sessionSavedKeys = useRef<Set<string>>(new Set())
  const supabase = createClient()

  // Debounce duplicate check on URL change
  // Key = video_id + processing_method (auto_captions & whisper_ai are separate)
  useEffect(() => {
    setIsCheckingDuplicate(!!url)
    const timer = setTimeout(async () => {
      if (!url) {
        setExistingTranscriptId(null);
        setExistingTranscriptMethod(null);
        setShowDuplicateChoices(false);
        setIsCheckingDuplicate(false);
        return
      }
      const validation = validateYouTubeUrl(url, 'video')
      if (validation.type !== 'VALID_VIDEO') {
        setIsCheckingDuplicate(false)
        return
      }

      // Extract video ID
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : "";

      if (videoId) {
        // Check in-memory session first (instant, no network)
        const captionsKey = `${videoId}:youtube_captions`;
        const whisperKey = `${videoId}:whisper_ai`;
        const sessionHasCaptions = sessionSavedKeys.current.has(captionsKey);
        const sessionHasWhisper = sessionSavedKeys.current.has(whisperKey);

        if (sessionHasCaptions || sessionHasWhisper) {
          // In-session hit: find the transcript ID from DB for the link
          const method = sessionHasCaptions ? 'youtube_captions' : 'whisper_ai';
          const { data } = await supabase
            .from('transcripts')
            .select('id')
            .eq('video_id', videoId)
            .eq('processing_method', method)
            .limit(1)
            .maybeSingle();
          setExistingTranscriptId(data?.id ?? null);
          setExistingTranscriptMethod(method);
          setShowDuplicateChoices(false);
          setIsCheckingDuplicate(false);
          return;
        }

        // DB check: look for youtube_captions first (most common)
        const { data: captionsRow } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('processing_method', 'youtube_captions')
          .limit(1)
          .maybeSingle();

        if (captionsRow) {
          setExistingTranscriptId(captionsRow.id);
          setExistingTranscriptMethod('youtube_captions');
          setShowDuplicateChoices(false);
          setIsCheckingDuplicate(false);
          return;
        }

        // DB check: whisper_ai
        const { data: whisperRow } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('processing_method', 'whisper_ai')
          .limit(1)
          .maybeSingle();

        setExistingTranscriptId(whisperRow?.id ?? null);
        setExistingTranscriptMethod(whisperRow ? 'whisper_ai' : null);
        setShowDuplicateChoices(false);
      }
      setIsCheckingDuplicate(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [url, supabase])

  // Reset Whisper toggle when URL changes
  useEffect(() => {
    setUseWhisper(false)
    setWhisperAutoTriggered(false)
  }, [url])

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

  // Estimate credits for Whisper (1 credit per 10 min, min 1)
  // Since we don't know duration before extraction, show a general estimate
  const estimatedCredits = 1 // Minimum, actual will depend on video length

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

    // Duplicate intercept: pause and ask for confirmation before proceeding
    if (existingTranscriptId && !showDuplicateChoices) {
      setShowDuplicateChoices(true)
      return
    }
    // If showDuplicateChoices is true here, user clicked "Toch extraheren"
    setShowDuplicateChoices(false)

    // Proceed with extraction. Default action is normal insert
    setLoading(true)
    setTranscript(null)
    setError(null)
    setVideoDuration(null)
    setSaveStatus('idle')
    setWhisperMetadata(null)

    // Extract video ID for Whisper path
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = targetUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : "";

    // If Whisper toggle is ON, first fetch video metadata for accurate credit calculation
    if (useWhisper && videoId) {
      setIsFetchingMeta(true)
      try {
        // First, fetch video metadata to get duration
        const metaResponse = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIdOrUrl: targetUrl, metadataOnly: true }),
        })

        const metaData = await metaResponse.json()

        // Calculate credits required
        let creditsRequired = 1 // Minimum
        let fetchedDuration = 0
        let fetchedTitle = ""

        if (metaResponse.ok && metaData.duration) {
          fetchedDuration = metaData.duration
          fetchedTitle = metaData.title || ""
          creditsRequired = Math.ceil(fetchedDuration / 600) // 1 credit per 10 min
        }

        // Check credits
        if (credits !== null && credits < creditsRequired) {
          setError({ message: `Not enough credits. This video requires ${creditsRequired} credit${creditsRequired !== 1 ? 's' : ''}, you have ${credits}.`, isCreditsError: true })
          setLoading(false)
          return
        }

        // Show confirmation step
        setPendingWhisperData({
          videoId,
          duration: fetchedDuration,
          title: fetchedTitle,
          creditsRequired
        })
        setShowWhisperConfirm(true)
        setLoading(false)
        return

      } catch (error: unknown) {
        // If metadata fetch fails, proceed with unknown duration
        console.warn('Could not fetch video metadata, proceeding with estimate:', error)

        // Show confirmation with unknown duration
        setPendingWhisperData({
          videoId,
          duration: 0,
          title: "",
          creditsRequired: 1 // Minimum estimate
        })
        setShowWhisperConfirm(true)
        setLoading(false)
        return
      } finally {
        setIsFetchingMeta(false)
      }
    }

    // Standard auto-captions extraction path
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIdOrUrl: targetUrl }),
      })

      const data = await response.json()

      if (!response.ok || data.success === false) {
        if (data.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          return
        }
        throw new Error(data.error || 'Failed to extract transcript')
      }

      setTranscript(data.transcript)
      setVideoTitle(data.title || "")
      setVideoUrl(data.video_url || targetUrl)
      setVideoDuration(data.duration || null)
      setLastProcessingMethod('youtube_captions')
      setWhisperMetadata(null)

      // Store current video id for upsell
      if (videoId) {
        setCurrentVideoId(videoId);
        // In-memory session tracking so repeat extractions on same page are detected instantly
        sessionSavedKeys.current.add(`${videoId}:youtube_captions`);
        setExistingTranscriptMethod('youtube_captions');
      }

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
           const regExp2 = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
           const match2 = (data.video_url || targetUrl).match(regExp2);
           const videoId2 = (match2 && match2[2].length === 11) ? match2[2] : "";

           await onTranscriptLoaded(data.transcript, {
             source: 'youtube',
             title: data.title,
             videoId: videoId2,
             videoUrl: data.video_url || targetUrl,
             duration: data.duration || 0,
             processingMethod: 'youtube_captions'
           })

           if (videoId2) {
             const { data: saved } = await supabase
               .from('transcripts')
               .select('id')
               .eq('video_id', videoId2)
               .eq('processing_method', 'youtube_captions')
               .order('created_at', { ascending: false })
               .limit(1)
               .maybeSingle();
             if (saved) setExistingTranscriptId(saved.id);
           }
        }

        // Clear URL input field after successful extraction
        setUrl("")

      } else {
        toast.info("Video has no captions available")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"

      if (errorMessage === 'members_only') {
        setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
        return
      }

      // Check if error is due to no captions available
      if (errorMessage.includes("No captions") || errorMessage.includes("captions")) {
        // Extract video ID for Whisper fallback
        if (videoId) {
          setCurrentVideoId(videoId)
          setWhisperAutoTriggered(true)
          setShowWhisperModal(true)
          return // Don't show error, show modal instead
        }
      }

      setError({ message: errorMessage })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setShowDuplicateChoices(false)
    }
  }



  const handleWhisperSuccess = async (transcript: TranscriptItem[], metadata: { videoId: string; title: string; duration: number; creditsUsed: number; source: string }) => {
    setTranscript(transcript)
    setVideoTitle(metadata.title || "")
    setVideoUrl(`https://www.youtube.com/watch?v=${metadata.videoId}`)
    setWhisperMetadata({ duration: metadata.duration, creditsUsed: metadata.creditsUsed })
    setLastProcessingMethod('whisper_ai')
    setWhisperAutoTriggered(true) // Mark that Whisper was auto-triggered
    // Track whisper save in session so a second click is instantly flagged as duplicate
    sessionSavedKeys.current.add(`${metadata.videoId}:whisper_ai`);
    setExistingTranscriptMethod('whisper_ai');

    // Auto-save: always INSERT a NEW record — never overwrite the existing auto-captions transcript
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
          processingMethod: 'whisper_ai',
          // Explicitly NO duplicateId — always creates a new record
          // Bug 3 fix: original auto-captions transcript stays untouched
        })
        setSaveStatus('saved')

          // Record is now in DB — fetch its ID so the duplicate banner shows immediately
          const { data: saved } = await supabase
            .from('transcripts')
            .select('id')
            .eq('video_id', metadata.videoId)
            .eq('processing_method', 'whisper_ai')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (saved) setExistingTranscriptId(saved.id);
        } catch (error) {
          console.error('Failed to save Whisper transcript:', error)
          setSaveStatus('error')
        }
      }

      // Clear URL input field after successful transcription
      setUrl("")
    }

  const handleWhisperError = (errorMessage: string) => {
    setError({ message: errorMessage })
    toast.error(errorMessage)
  }

  // Execute Whisper extraction after user confirms
  const handleWhisperConfirm = async () => {
    if (!pendingWhisperData) return

    setShowWhisperConfirm(false)
    setLoading(true)
    setError(null)
    setWhisperStatus('idle')
    setSaveStatus('idle')
    setWhisperMetadata(null)

    const { videoId } = pendingWhisperData

    try {
      const formData = new FormData()
      formData.append('source_type', 'youtube')
      formData.append('video_id', videoId)

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          return
        }
        throw new Error(errorData.error || 'Failed to extract transcript with Whisper AI')
      }

      const jobData = await response.json()
      if (!jobData.job_id) {
        throw new Error('Failed to start transcription job')
      }

      setIsStreaming(true)
      setWhisperStatus('pending')
      const event = await pollWhisperJob(jobData.job_id, (status) => setWhisperStatus(status))
      setIsStreaming(false)

      if (event.type === 'error') {
        if (event.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          return
        }
        if (event.code === 'insufficient_credits') {
          setError({ message: `Not enough credits. This video requires ${event.required_credits} credit${event.required_credits !== 1 ? 's' : ''}, you have ${event.available_credits}.`, isCreditsError: true })
          return
        }
        throw new Error(event.error || 'Transcription failed')
      }

      // event.type === 'complete'
      setTranscript(event.transcript)
      setVideoTitle(pendingWhisperData.title || "")
      setVideoUrl(`https://www.youtube.com/watch?v=${videoId}`)
      setVideoDuration(event.duration || null)
      setLastProcessingMethod('whisper_ai')
      setWhisperMetadata({ duration: event.duration, creditsUsed: event.credits_used || 1 })
      setCurrentVideoId(videoId)

      sessionSavedKeys.current.add(`${videoId}:whisper_ai`)
      setExistingTranscriptMethod('whisper_ai')

      posthog.capture('transcript_extracted', {
        type: 'video',
        credits_used: event.credits_used || 1,
        processing_method: 'whisper_ai',
        user_selected_whisper: true
      })

      if (event.transcript && event.transcript.length > 0) {
        toast.success("Transcript extracted & saved with Whisper AI", {
          description: "Added to your library automatically.",
          action: {
            label: "View",
            onClick: () => window.location.href = '/dashboard/library'
          }
        })

        if (onTranscriptLoaded) {
          await onTranscriptLoaded(event.transcript, {
            source: 'youtube',
            title: pendingWhisperData.title,
            videoId: videoId,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            duration: event.duration || 0,
            creditsUsed: event.credits_used || 1,
            processingMethod: 'whisper_ai'
          })

          const { data: saved } = await supabase
            .from('transcripts')
            .select('id')
            .eq('video_id', videoId)
            .eq('processing_method', 'whisper_ai')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (saved) setExistingTranscriptId(saved.id)
        }

        setSaveStatus('saved')
        refreshCredits()
        setUrl("")
        setUseWhisper(false)
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Whisper extraction failed'
      const isYouTubeRestricted = errMsg.includes('152') || errMsg.toLowerCase().includes('unavailable')
      setError({
        message: isYouTubeRestricted
          ? "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here."
          : errMsg,
        isYouTubeRestricted
      })
      if (!isYouTubeRestricted) {
        toast.error(errMsg)
      }
    } finally {
      setLoading(false)
      setWhisperStatus('idle')
      setIsStreaming(false)
      setShowDuplicateChoices(false)
      setPendingWhisperData(null)
    }
  }

  const handleWhisperCancel = () => {
    setShowWhisperConfirm(false)
    setPendingWhisperData(null)
  }

  const handleWhisperUpsell = async () => {
    if (!currentVideoId) return
    posthog.capture('whisper_upsell_clicked')

    setLoading(true)
    setIsReextracting(true)
    setError(null)
    setTranscript(null)
    setWhisperStatus('idle')

    try {
      const formData = new FormData()
      formData.append('source_type', 'youtube')
      formData.append('video_id', currentVideoId)

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          return
        }
        throw new Error(errorData.error || 'Failed to extract transcript with Whisper AI')
      }

      const jobData = await response.json()
      if (!jobData.job_id) {
        throw new Error('Failed to start transcription job')
      }

      setIsStreaming(true)
      setWhisperStatus('pending')
      const event = await pollWhisperJob(jobData.job_id, (status) => setWhisperStatus(status))
      setIsStreaming(false)

      if (event.type === 'error') {
        if (event.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          return
        }
        throw new Error(event.error || 'Transcription failed')
      }

      posthog.capture('transcript_extracted', {
        type: 'video',
        credits_used: event.credits_used || 1,
        processing_method: 'whisper_ai'
      })

      await handleWhisperSuccess(event.transcript, {
        videoId: currentVideoId,
        title: videoTitle,
        duration: event.duration,
        creditsUsed: event.credits_used || 1,
        source: 'youtube'
      })

      refreshCredits()
    } catch (err: unknown) {
      console.error('[WHISPER UPSELL] ERROR caught:', err)
      const errMsg = err instanceof Error ? err.message : 'Whisper extraction failed'
      const isYouTubeRestricted = errMsg.includes('152') || errMsg.toLowerCase().includes('unavailable')
      if (isYouTubeRestricted) {
        setError({
          message: "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here.",
          isYouTubeRestricted: true
        })
      } else {
        handleWhisperError(errMsg)
      }
    } finally {
      setLoading(false)
      setWhisperStatus('idle')
      setIsStreaming(false)
      setIsReextracting(false)
    }
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
              onKeyDown={(e) => e.key === 'Enter' && !showDuplicateChoices && handleExtract()}
            />
           </div>

          {!showDuplicateChoices && (
            <Button
              size="lg"
              className="h-12 px-6 w-full sm:w-auto min-w-[120px]"
              onClick={() => handleExtract()}
              disabled={loading || !url || isCheckingDuplicate}
            >
              {loading || isCheckingDuplicate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading && isFetchingMeta ? "Checking..." : loading ? "Extracting" : isCheckingDuplicate ? "Checking..." : useWhisper ? "Check" : "Extract"}
            </Button>
          )}
        </div>

        {/* Whisper Toggle - only for logged-in users, hidden if Whisper was auto-triggered */}
        {user && !whisperAutoTriggered && !loading && !showWhisperConfirm && (
          <div className="flex items-start gap-3 px-1">
            <button
              type="button"
              role="switch"
              aria-checked={useWhisper}
              onClick={() => {
                if (!useWhisper) {
                  posthog.capture('whisper_toggle_enabled')
                }
                setUseWhisper(!useWhisper)
              }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                useWhisper ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  useWhisper ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <div className="flex flex-col gap-0.5">
              <label
                className={cn(
                  "text-sm font-medium cursor-pointer flex items-center gap-1.5",
                  useWhisper ? "text-primary" : "text-foreground"
                )}
                onClick={() => {
                  if (!useWhisper) {
                    posthog.capture('whisper_toggle_enabled')
                  }
                  setUseWhisper(!useWhisper)
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use Whisper AI for higher accuracy
              </label>
              <p className="text-xs text-muted-foreground">
                Costs credits based on video length (~{estimatedCredits}+ credit). Auto-captions are free.
              </p>
              {useWhisper && credits !== null && (
                <p className="text-xs text-primary mt-0.5">
                  You have {credits} credit{credits !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          </div>
        )}

        {/* Whisper Confirmation Step */}
        {showWhisperConfirm && pendingWhisperData && (
          <div className="px-4 py-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground mb-1">
                  {pendingWhisperData.duration > 0 ? (
                    <>This video is {Math.round(pendingWhisperData.duration / 60)} minutes.</>
                  ) : (
                    <>Video duration unknown.</>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  {pendingWhisperData.duration > 0 ? (
                    <>Whisper AI will cost <span className="font-semibold text-primary">{pendingWhisperData.creditsRequired} credit{pendingWhisperData.creditsRequired !== 1 ? 's' : ''}</span>. You have <span className="font-semibold">{credits}</span> credits.</>
                  ) : (
                    <>Whisper AI will cost approximately <span className="font-semibold text-primary">{pendingWhisperData.creditsRequired}+ credit{pendingWhisperData.creditsRequired !== 1 ? 's' : ''}</span> (1 credit per 10 min). You have <span className="font-semibold">{credits}</span> credits.</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Estimated processing time: {pendingWhisperData.duration > 0 ? getWhisperProcessingEstimate(pendingWhisperData.duration) : "varies by length"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleWhisperConfirm}
                    disabled={loading}
                    className="h-8"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                    Confirm & Extract
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleWhisperCancel}
                    disabled={loading}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate pause-and-confirm prompt */}
        {existingTranscriptId && showDuplicateChoices && (
          <div className="px-1 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">You already have this transcript in your library. Extract again?</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <Link
                href={`/dashboard/library/${existingTranscriptId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View in Library
              </Link>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <button
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={() => handleExtract()}
              >
                Extract anyway
              </button>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <button
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={() => setShowDuplicateChoices(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Soft info banner: shown when duplicate exists but prompt is not active */}
        {existingTranscriptId && !showDuplicateChoices && (
          <div className="px-1 -mt-1 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {existingTranscriptMethod === 'whisper_ai'
                ? 'You already have this transcript (Whisper AI) — '
                : 'You already have this transcript in your library — '}
            </span>
            <Link href={`/dashboard/library/${existingTranscriptId}`} className="font-medium hover:underline">
              View in Library
            </Link>
          </div>
        )}

        {/* Normal error text */}
        {!existingTranscriptId && !showDuplicateChoices && !showWhisperConfirm && (
          <div className="flex justify-between items-start px-1">
             {error?.isMembersOnly ? (
               <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 w-full">
                 <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                 <div>
                   <p className="text-sm font-medium text-destructive">Members-Only Video</p>
                   <p className="text-sm text-destructive/80 mt-0.5">This video is only available to channel members and cannot be transcribed by INDXR.AI.</p>
                 </div>
               </div>
             ) : error?.isYouTubeRestricted ? (
               <div className="flex flex-col gap-2 w-full">
                 <p className="text-sm text-destructive">
                   {error.message}
                 </p>
                 {onSwitchToAudio && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={onSwitchToAudio}
                     className="self-start h-8 text-xs"
                   >
                     <Mic className="h-3 w-3 mr-1.5" />
                     Open Audio Upload →
                   </Button>
                 )}
               </div>
             ) : error?.isCreditsError ? (
               <div className="flex flex-col gap-2 w-full">
                 <p className="text-sm text-destructive">
                   {error.message}
                 </p>
                 <Link href="/pricing" className="self-start">
                   <Button
                     variant="outline"
                     size="sm"
                     className="h-8 text-xs"
                   >
                     Buy Credits →
                   </Button>
                 </Link>
               </div>
             ) : loading && whisperStatus !== 'idle' ? (
               <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                 <Loader2 className="h-3 w-3 animate-spin" />
                 <span>
                   {whisperStatus === 'pending' ? 'Starting transcription...'
                   : whisperStatus === 'downloading' ? 'Downloading audio from YouTube...'
                   : whisperStatus === 'transcribing' ? 'Transcribing with Whisper AI...'
                   : 'Saving transcript...'}
                 </span>
               </div>
             ) : (
               <p className={cn("text-sm text-muted-foreground", error && "text-destructive")}>
                 {error ? error.message : "Paste any YouTube video URL to extract captions"}
               </p>
             )}
          </div>
        )}
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
      {loading && !transcript && !isStreaming && (
          <div className="w-full max-w-4xl mx-auto mt-8">
             <CardSkeleton />
          </div>
      )}

      {/* Transcript Display */}
      {transcript !== null && transcript.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">

          {/* Whisper Promo Banner - only show if NOT already using Whisper */}
          {lastProcessingMethod === 'youtube_captions' && (credits !== null) && (() => {
             const requiredCredits = videoDuration ? Math.ceil(videoDuration / 600) : 1;
             const hasEnoughCredits = credits >= requiredCredits;
             return (
               <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-left gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div>
                   <span className="text-sm text-amber-600 dark:text-amber-500 font-medium block">Not happy with the auto-captions?</span>
                   <span className="text-xs text-muted-foreground mt-1 block">
                     {hasEnoughCredits ? (
                       `You have ${credits} credits remaining`
                     ) : (
                       <Link href="/dashboard/credits" className="text-amber-600 hover:text-amber-700 hover:underline">
                         Not enough credits — top up
                       </Link>
                     )}
                   </span>
                 </div>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleWhisperUpsell}
                   className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/20 h-9 font-semibold whitespace-nowrap"
                   disabled={loading || isReextracting || !hasEnoughCredits}
                 >
                   {isReextracting ? (
                     <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Extracting...</>
                   ) : (
                     `✨ Re-extract with Whisper AI · ${requiredCredits} credit${requiredCredits !== 1 ? 's' : ''}`
                   )}
                 </Button>
               </div>
             );
          })()}

          {/* Success Banner for Whisper Transcription */}
          {saveStatus === 'saved' && whisperMetadata && (
            <div className="mb-4 p-4 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center justify-between text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex-1">
                <p className="text-green-600 dark:text-green-400 font-semibold mb-1">Transcript ready! Whisper AI processed your video successfully.</p>
                <p className="text-xs text-muted-foreground">
                  Used {whisperMetadata.creditsUsed} credit{whisperMetadata.creditsUsed !== 1 ? 's' : ''} • {Math.round(whisperMetadata.duration / 60)} min
                </p>
              </div>
              <Link href="/dashboard/library">
                <Button variant="outline" size="sm" className="ml-4 border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/10">
                  View in Library
                </Button>
              </Link>
            </div>
          )}

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
