"use client"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Plus } from "lucide-react"
import { TranscriptCard, TranscriptItem } from "../TranscriptCard"
import { TranscriptMetadata, PROCESSING_METHODS } from "../../types/transcript"
import { validateYouTubeUrl, YouTubeUrlType } from "../../utils/youtube"
import Link from "next/link"
import { marketingHref, appHref } from "../../lib/cross-host-links"
import { createClient } from "../../utils/supabase/client"
import { CardSkeleton } from "../ui/loading-skeleton"
import { cn } from "../../lib/utils"
import { useAuth } from "../../hooks/useAuth"
import { useJobStatus, JobStatusRow } from "../../hooks/useJobStatus"
import posthog from "posthog-js"
import { JobProgressCard } from "../transcribe/JobProgressCard"
import { ResultCardShell } from "../transcribe/ResultCardShell"
import { MethodRadioCards } from "../transcribe/MethodRadioCards"
import { MethodBadge } from "../transcribe/MethodBadge"
import { BalanceLine } from "../transcribe/CostBreakdown"
import { ErrorCard } from "../transcribe/ErrorCard"
import { resolveErrorCopy } from "../transcribe/errorCopy"

interface VideoTabProps {
  onPlaylistDetected?: () => void
  onTranscriptLoaded?: (transcript: TranscriptItem[], metadata: TranscriptMetadata) => void
  onSwitchToAudio?: () => void
  /** Anonymous visitor picked the AI source — gate it (show FrictionConversionCard). */
  onAiRequiresAuth?: () => void
}

type WhisperStatus = 'idle' | 'pending' | 'downloading' | 'transcribing' | 'saving'

const VIDEO_JOB_KEY = 'indxr-active-video-job'


function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoTab({ onPlaylistDetected, onTranscriptLoaded, onSwitchToAudio, onAiRequiresAuth }: VideoTabProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null)
  const [showSignupCard, setShowSignupCard] = useState(false)
  const [videoTitle, setVideoTitle] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<{ message: string, type?: YouTubeUrlType, isYouTubeRestricted?: boolean, isCreditsError?: boolean, isMembersOnly?: boolean, isNoSpeech?: boolean, errorType?: string, creditsRefunded?: number | null, requiredCredits?: number | null } | null>(null)
  const [isPlaylistUrl, setIsPlaylistUrl] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [whisperMetadata, setWhisperMetadata] = useState<{ duration: number; creditsUsed: number; truncationWarning?: string } | null>(null)
  const [lastProcessingMethod, setLastProcessingMethod] = useState<'youtube_captions' | 'whisper_ai' | 'assemblyai' | null>(null)
  const [videoChannel, setVideoChannel] = useState<string | null>(null)
  const [videoLanguage, setVideoLanguage] = useState<string | null>(null)
  const [videoPublishedAt, setVideoPublishedAt] = useState<string | null>(null)
  const [languageDetected, setLanguageDetected] = useState<boolean | null>(null)
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

  // Whisper network disconnect banner state (fetch exceptions > 3 consecutive)
  const [whisperNetworkDisconnected, setWhisperNetworkDisconnected] = useState(false)
  // Shown when mount-check detects a watchdog_permanent_failure — credits already refunded
  const [watchdogRefundNotice, setWatchdogRefundNotice] = useState(false)
  // True when backend returned deduplicated:true — an existing job is being re-used
  const [isAlreadyProcessing, setIsAlreadyProcessing] = useState(false)

  // Session resume state — populated on mount when a Whisper job is still running
  const [videoResumeData, setVideoResumeData] = useState<{
    jobId: string; videoId: string; title: string; duration: number; startTime: number; status: WhisperStatus
  } | null>(null)
  const [resumeBarActive, setResumeBarActive] = useState(false)

  // Whisper toggle state
  const [useWhisper, setUseWhisper] = useState(false)
  // Track if Whisper was triggered automatically (no captions available)
  const [whisperAutoTriggered, setWhisperAutoTriggered] = useState(false)

  // SSE streaming state
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>('idle')
  // Live download progress bytes (point 5) — null until the backend writes them.
  const [downloadBytes, setDownloadBytes] = useState<number | null>(null)
  const [downloadTotalBytes, setDownloadTotalBytes] = useState<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  // True while fetching video metadata for Whisper cost estimation
  const [isFetchingMeta, setIsFetchingMeta] = useState(false)

  // Live elapsed timer for Whisper processing
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null)
  const elapsedRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentJobIdRef = useRef<string | null>(null)
  // Ref mirror of useWhisper — always up-to-date regardless of closure staleness
  const useWhisperRef = useRef(false)

  // Cooldown: tracks the last successful extraction to suppress immediate duplicate warnings
  const lastSuccessTimestampRef = useRef<{ videoId: string; time: number } | null>(null)
  // Last URL submitted to handleExtract — replayed verbatim by the error card's "Try again".
  const retryAttemptRef = useRef<string>("")
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Active Whisper job being tracked (Realtime + polling)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const activeJobContextRef = useRef<{ videoId: string; title: string; context: 'confirm' | 'upsell' | 'resume' } | null>(null)

  const _handleWhisperComplete = (job: JobStatusRow) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsStreaming(false)
    setFinalElapsed(elapsedRef.current)

    const ctx = activeJobContextRef.current
    const transcript = job.transcript as TranscriptItem[] | undefined
    if (!transcript || transcript.length === 0) {
      setLoading(false)
      setWhisperStatus('idle')
      setShowDuplicateChoices(false)
      setPendingWhisperData(null)
      activeJobContextRef.current = null
      setActiveJobId(null)
      return
    }

    sessionStorage.removeItem(VIDEO_JOB_KEY)

    const videoId = ctx?.videoId ?? currentVideoId
    const title = ctx?.title ?? videoTitle
    const truncationWarning = typeof job.error_message === 'string' && job.error_message.startsWith('Transcript may be incomplete')
      ? job.error_message
      : undefined

    setTranscript(transcript)
    setVideoTitle(title || "")
    setVideoUrl(`https://www.youtube.com/watch?v=${videoId}`)
    setVideoDuration(job.duration_seconds || null)
    setLastProcessingMethod('whisper_ai')
    setVideoChannel(job.channel ?? null)
    setVideoLanguage(job.language ?? null)
    setWhisperMetadata({ duration: job.duration_seconds ?? 0, creditsUsed: job.credits_cost || 1, truncationWarning })
    setCurrentVideoId(videoId)
    sessionSavedKeys.current.add(`${videoId}:whisper_ai`)
    setExistingTranscriptMethod('assemblyai')
    if (ctx?.context === 'upsell') setWhisperAutoTriggered(true)
    if (job.transcript_id) { setExistingTranscriptId(job.transcript_id); existingTranscriptIdRef.current = job.transcript_id }

    posthog.capture('transcript_extracted', {
      type: 'video',
      credits_used: job.credits_cost || 1,
      processing_method: PROCESSING_METHODS.ASSEMBLYAI,
      ...(ctx?.context === 'confirm' ? { user_selected_whisper: true } : {}),
    })

    window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
    setSaveStatus('saved')
    refreshCredits()

    if (ctx?.context !== 'upsell') {
      setUrl("")
      setUseWhisper(false)
      useWhisperRef.current = false
    }
    lastSuccessTimestampRef.current = { videoId, time: Date.now() }

    setLoading(false)
    setWhisperStatus('idle')
    setShowDuplicateChoices(false)
    setPendingWhisperData(null)
    setIsAlreadyProcessing(false)
    activeJobContextRef.current = null
    setActiveJobId(null)
  }

  const _handleWhisperError = (job: JobStatusRow) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsStreaming(false)
    setFinalElapsed(elapsedRef.current)

    if (job.status === 'network_error') {
      setWhisperNetworkDisconnected(true)
      const ctx = activeJobContextRef.current
      if (ctx) {
        sessionStorage.setItem(VIDEO_JOB_KEY, JSON.stringify({
          jobId: currentJobIdRef.current,
          videoId: ctx.videoId,
          title: ctx.title,
          duration: 0,
          startTime: Date.now() - elapsedRef.current * 1000,
          status: 'transcribing',
        }))
      }
    } else {
      sessionStorage.removeItem(VIDEO_JOB_KEY)
      const errorMsg = job.error_message || 'Transcription failed'
      if (job.error_type === 'watchdog_permanent_failure') {
        // Its own dedicated notice (with the refund) — never also a generic error card beside it.
        // Clear any error so the two can't stack.
        setError(null)
        setWatchdogRefundNotice(true)
      } else if (errorMsg === 'members_only' || job.error_type === 'members_only') {
        setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
      } else if (job.error_type === 'insufficient_credits') {
        // Balance comes from useAuth at render time (never a copied poll value); the required
        // amount is the backend's required_credits (now populated) so the card shows both numbers.
        setError({ message: 'Not enough credits to transcribe this video.', isCreditsError: true, requiredCredits: job.required_credits ?? null })
      } else if (errorMsg === 'no_speech_detected' || job.error_type === 'no_speech') {
        setError({ message: '', isNoSpeech: true })
      } else {
        const isYouTubeRestricted = errorMsg.includes('152') || errorMsg.toLowerCase().includes('unavailable')
        // Carry the backend error_type (now always persisted) so the ErrorCard keys on it and
        // never falls back to the raw provider string (ADR-080 fix).
        setError({
          message: isYouTubeRestricted
            ? "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here."
            : errorMsg,
          isYouTubeRestricted,
          errorType: isYouTubeRestricted ? 'youtube_restricted' : (job.error_type ?? undefined),
          creditsRefunded: job.credits_refunded ?? null,
        })
      }
    }

    setLoading(false)
    setWhisperStatus('idle')
    setIsReextracting(false)
    setShowDuplicateChoices(false)
    setPendingWhisperData(null)
    setIsAlreadyProcessing(false)
    activeJobContextRef.current = null
    setActiveJobId(null)
  }

  useJobStatus({
    jobId: activeJobId,
    jobType: 'transcription',
    onUpdate: (job) => {
      const s = job.status as WhisperStatus
      if (s === 'pending' || s === 'downloading' || s === 'transcribing' || s === 'saving') {
        setWhisperStatus(s)
      }
      // Live download bytes (point 5) — undefined until the backend writes the columns.
      setDownloadBytes(job.download_bytes ?? null)
      setDownloadTotalBytes(job.download_total_bytes ?? null)
    },
    onComplete: _handleWhisperComplete,
    onError: _handleWhisperError,
  })

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

  // Auto-resume countdown: when banner appears, resume automatically after 5 s
  useEffect(() => {
    if (!videoResumeData || isStreaming) {
      setResumeBarActive(false)
      return
    }
    setResumeBarActive(false)
    // One rAF tick so the transition fires from width 0
    const raf = requestAnimationFrame(() => setResumeBarActive(true))
    autoResumeRef.current = setTimeout(handleVideoResume, 5000)
    return () => {
      cancelAnimationFrame(raf)
      if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoResumeData, isStreaming])

  // On mount: check for a running Whisper job from a previous page session
  useEffect(() => {
    const raw = sessionStorage.getItem(VIDEO_JOB_KEY)
    if (!raw) return
    let parsed: { jobId: string; videoId: string; title: string; duration: number; startTime: number; status: string }
    try { parsed = JSON.parse(raw) } catch { sessionStorage.removeItem(VIDEO_JOB_KEY); return }
    ;(async () => {
      try {
        const resp = await fetch(`/api/jobs/${parsed.jobId}`)
        if (!resp.ok) {
          // 4xx/5xx from the API — job doesn't exist, access denied, or auth failed.
          // Only remove the key for definitive rejections (401, 403, 404).
          // 5xx could be transient; keep the key so the banner still shows.
          if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
            sessionStorage.removeItem(VIDEO_JOB_KEY)
          } else {
            // Transient server error — show banner anyway; Resume will re-verify
            setVideoResumeData({
              jobId: parsed.jobId,
              videoId: parsed.videoId,
              title: parsed.title,
              duration: parsed.duration,
              startTime: parsed.startTime,
              status: (parsed.status as WhisperStatus) || 'pending',
            })
          }
          return
        }
        const job = await resp.json()
        if (job.status === 'error' && job.error_type === 'watchdog_permanent_failure') {
          sessionStorage.removeItem(VIDEO_JOB_KEY)
          setWatchdogRefundNotice(true)
        } else if (job.status === 'complete' || job.status === 'error' || job.status === 'interrupted') {
          sessionStorage.removeItem(VIDEO_JOB_KEY)
        } else if (['pending', 'downloading', 'transcribing', 'saving'].includes(job.status)) {
          setVideoResumeData({
            jobId: parsed.jobId,
            videoId: parsed.videoId,
            title: parsed.title,
            duration: parsed.duration,
            startTime: parsed.startTime,
            status: job.status as WhisperStatus,
          })
        } else {
          sessionStorage.removeItem(VIDEO_JOB_KEY)
        }
      } catch {
        // Network exception (offline, Railway cold-start, Vercel timeout).
        // Keep the key and show the banner — Resume will re-poll when online.
        setVideoResumeData({
          jobId: parsed.jobId,
          videoId: parsed.videoId,
          title: parsed.title,
          duration: parsed.duration,
          startTime: parsed.startTime,
          status: (parsed.status as WhisperStatus) || 'pending',
        })
      }
    })()
  }, [])

  const [existingTranscriptId, setExistingTranscriptId] = useState<string | null>(null)
  const existingTranscriptIdRef = useRef<string | null>(null)
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
        existingTranscriptIdRef.current = null;
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
        // Suppress the duplicate warning for the transcript this session just
        // created. No time window: the previous 10s cooldown let the banner
        // re-appear once the freshly created transcript landed in the DB (the
        // check effect re-runs on every render). We keep existingTranscriptIdRef
        // intact so the result card keeps its Library link; only the banner
        // state is cleared. handleUrlChange resets this marker, so deliberately
        // re-entering a URL for an existing transcript still warns.
        const recent = lastSuccessTimestampRef.current
        if (recent && recent.videoId === videoId) {
          setExistingTranscriptId(null)
          setExistingTranscriptMethod(null)
          setShowDuplicateChoices(false)
          setIsCheckingDuplicate(false)
          return
        }

        // Only warn about a duplicate of the METHOD you're about to run. Auto-captions and AI
        // transcription are separate outputs — having the captions version must never block an AI
        // run, and vice versa. The effect re-runs when the AI toggle flips (dep below).
        const wantAi = useWhisper
        const targetMethod = wantAi ? 'assemblyai' : 'youtube_captions'

        const { data: row } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('processing_method', targetMethod)
          .limit(1)
          .maybeSingle();

        setExistingTranscriptId(row?.id ?? null);
        existingTranscriptIdRef.current = row?.id ?? null;
        setExistingTranscriptMethod(row ? targetMethod : null);
        setShowDuplicateChoices(false);
      }
      setIsCheckingDuplicate(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [url, supabase, useWhisper])

  // Reset Whisper toggle when URL changes
  useEffect(() => {
    setUseWhisper(false)
    useWhisperRef.current = false
    setWhisperAutoTriggered(false)
  }, [url])

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)

    // A manual URL edit begins a fresh attempt: drop the "just created" marker
    // so the duplicate warning can fire again for an already-existing transcript.
    lastSuccessTimestampRef.current = null

    // Detect if the URL is a playlist for the smart suggestion
    const validation = validateYouTubeUrl(newUrl, 'video')
    setIsPlaylistUrl(validation.type === 'PLAYLIST_IN_VIDEO')

    // Clear validation-only errors when URL changes
    if (error && ['NON_YOUTUBE', 'MALFORMED', 'PLAYLIST_IN_VIDEO', 'CHANNEL'].includes(error.type || '')) {
      setError(null)
    }
  }

  // "New transcription" (point 2): after a result the input collapses to a single action;
  // this returns the tab to a clean input state, mirroring the playlist "Start new extraction".
  const handleNewTranscription = () => {
    setTranscript(null)
    setUrl('')
    setVideoTitle('')
    setVideoUrl('')
    setError(null)
    setShowSignupCard(false)
    setVideoDuration(null)
    setVideoChannel(null)
    setVideoLanguage(null)
    setVideoPublishedAt(null)
    setLanguageDetected(null)
    setSaveStatus('idle')
    setWhisperMetadata(null)
    setWhisperStatus('idle')
    setFinalElapsed(null)
    setLastProcessingMethod(null)
    setCurrentVideoId("")
    setExistingTranscriptId(null)
    existingTranscriptIdRef.current = null
    setExistingTranscriptMethod(null)
    setShowWhisperConfirm(false)
    setShowDuplicateChoices(false)
    setWhisperAutoTriggered(false)
    setUseWhisper(false)
    useWhisperRef.current = false
    setIsPlaylistUrl(false)
    lastSuccessTimestampRef.current = null
  }

  const handleExtract = async (videoIdOrUrl?: string) => {
    const targetUrl = videoIdOrUrl || url
    if (!targetUrl) return

    // Remember exactly what was attempted so the error card's "Try again" can re-run the SAME
    // extraction (point 1) — it used to clear the field, forcing a re-paste. handleExtract routes
    // on useWhisperRef, so replaying this URL replays the method (captions vs AI) too.
    retryAttemptRef.current = targetUrl

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
        case 'CHANNEL':
          message = "INDXR extracts videos and playlists, not entire channels. Create a playlist from the channel's videos (YouTube Studio or a public playlist) and paste that playlist URL — or paste a single video URL."
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
    setShowSignupCard(false)
    setError(null)
    setVideoDuration(null)
    setVideoChannel(null)
    setVideoLanguage(null)
    setVideoPublishedAt(null)
    setLanguageDetected(null)
    setSaveStatus('idle')
    setWhisperMetadata(null)

    // Extract video ID for Whisper path
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = targetUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : "";

    // If Whisper toggle is ON, first fetch video metadata for accurate credit calculation
    if (useWhisperRef.current && videoId) {
      setIsFetchingMeta(true)
      try {
        // Fetch video metadata to get duration — use dedicated endpoint so we always
        // get duration/title even when the video has no captions
        const metaResponse = await fetch(`/api/video/metadata/${videoId}`)

        const metaData = await metaResponse.json()

        // Calculate credits required
        let creditsRequired = 1 // Minimum
        let fetchedDuration = 0
        let fetchedTitle = ""

        if (metaResponse.ok && metaData.duration) {
          fetchedDuration = metaData.duration
          fetchedTitle = metaData.title || ""
          creditsRequired = Math.ceil(fetchedDuration / 60) // 1 credit per minute
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
        const errType: string | null = data.error_type || null
        if (errType === 'members_only' || data.error === 'members_only') {
          setError({ message: "This video is members-only. Only channel members can access it.", isMembersOnly: true, errorType: 'members_only' })
          return
        }
        if (errType === 'no_captions' || (data.error || '').toLowerCase().includes('no captions')) {
          setError({ message: "No captions found for this video.", errorType: 'no_captions' })
          return
        }
        if (errType === 'bot_detection') {
          setError({ message: "YouTube temporarily blocked our request.", errorType: 'bot_detection' })
          return
        }
        if (errType === 'age_restricted') {
          setError({ message: "This video is age-restricted. YouTube requires a signed-in account — AI transcription cannot help here.", errorType: 'age_restricted' })
          return
        }
        if (errType === 'youtube_restricted') {
          setError({ message: "This video is unavailable — it may be removed, geo-blocked, or restricted on YouTube.", isYouTubeRestricted: true, errorType: 'youtube_restricted' })
          return
        }
        if (errType === 'extraction_error') {
          setError({ message: "Extraction failed. Try again in a moment.", errorType: 'extraction_error' })
          return
        }
        setError({ message: data.error || 'Failed to extract transcript', errorType: errType ?? undefined })
        return
      }

      setTranscript(data.transcript)
      setVideoTitle(data.title || "")
      setVideoUrl(data.video_url || targetUrl)
      setVideoDuration(data.duration || null)
      setVideoChannel(data.channel || null)
      setVideoLanguage(data.language || null)
      setVideoPublishedAt(data.published_at || null)
      setLanguageDetected(data.language_detected ?? null)
      setLastProcessingMethod('youtube_captions')
      setWhisperMetadata(null)

      // Store current video id for upsell
      if (videoId) {
        setCurrentVideoId(videoId);
        // In-memory session tracking so repeat extractions on same page are detected instantly
        sessionSavedKeys.current.add(`${videoId}:youtube_captions`);
        setExistingTranscriptMethod('youtube_captions');
        lastSuccessTimestampRef.current = { videoId, time: Date.now() };
      }

      // Track in PostHog
      posthog.capture('transcript_extracted', {
          type: 'video',
          credits_used: 0, // YouTube captions are free in this flow (non-Whisper)
          processing_method: 'youtube_captions'
      })

      if (data.transcript && data.transcript.length > 0) {
        if (!user) {
          setShowSignupCard(true)
        }

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
             processingMethod: 'youtube_captions',
             channel: data.channel ?? null,
             language: data.language ?? null,
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
             if (saved) { setExistingTranscriptId(saved.id); existingTranscriptIdRef.current = saved.id; }
           }
        }

        // Clear URL input field after successful extraction
        setUrl("")

      } else {
        setError({ message: "Video has no captions available. Enable 'Generate with AI' above to transcribe it with AI." })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"

      if (errorMessage === 'members_only') {
        setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
        return
      }

      // Check if error is due to no captions available
      if (errorMessage.includes("No captions") || errorMessage.includes("captions")) {
        setError({ message: 'No captions available for this video. Enable "Generate with AI" above to transcribe it with AI.' })
        return
      }

      setError({ message: errorMessage })
    } finally {
      setLoading(false)
      setShowDuplicateChoices(false)
    }
  }



  // Execute Whisper extraction after user confirms
  const handleWhisperConfirm = async () => {
    if (!pendingWhisperData) return

    setShowWhisperConfirm(false)
    setLoading(true)
    setError(null)
    setWhisperNetworkDisconnected(false)
    setWhisperStatus('idle')
    setSaveStatus('idle')
    setWhisperMetadata(null)

    const { videoId } = pendingWhisperData

    try {
      const formData = new FormData()
      formData.append('source_type', 'youtube')
      formData.append('video_id', videoId)
      if (pendingWhisperData.title) formData.append('title', pendingWhisperData.title)
      if (pendingWhisperData.duration > 0) formData.append('duration', String(pendingWhisperData.duration))

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'storage_full') {
          setError({ message: "Your library is full, so new transcriptions are paused. Delete some transcripts from your library, or buy more space on your Account page, then try again. No credits were charged.", errorType: 'storage_full' })
          setLoading(false)
          setWhisperStatus('idle')
          return
        }
        if (errorData.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          setLoading(false)
          setWhisperStatus('idle')
          setShowDuplicateChoices(false)
          setPendingWhisperData(null)
          return
        }
        throw new Error(errorData.error || 'Failed to extract transcript with AI transcription')
      }

      const jobData = await response.json()
      if (!jobData.job_id) throw new Error('Failed to start transcription job')

      const isDedup = !!jobData.deduplicated
      const initialStatus = (isDedup ? jobData.status : 'pending') as WhisperStatus

      sessionStorage.setItem(VIDEO_JOB_KEY, JSON.stringify({
        jobId: jobData.job_id, videoId,
        title: pendingWhisperData.title, duration: pendingWhisperData.duration,
        startTime: Date.now(), status: initialStatus,
      }))

      if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null }
      elapsedRef.current = 0
      setElapsedSeconds(0)
      setFinalElapsed(null)
      currentJobIdRef.current = jobData.job_id
      setIsStreaming(true)
      setWhisperStatus(initialStatus)
      intervalRef.current = setInterval(() => { elapsedRef.current += 1; setElapsedSeconds(s => s + 1) }, 1000)

      activeJobContextRef.current = { videoId, title: pendingWhisperData.title, context: 'confirm' }
      setIsAlreadyProcessing(isDedup)
      setActiveJobId(jobData.job_id)
      refreshCredits()  // ADR-050: reflect the reservation in the topbar immediately (backend reserved before returning job_id)
      // Completion and error are handled by _handleWhisperComplete / _handleWhisperError
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Whisper extraction failed'
      const isYouTubeRestricted = errMsg.includes('152') || errMsg.toLowerCase().includes('unavailable')
      setError({
        message: isYouTubeRestricted
          ? "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here."
          : errMsg,
        isYouTubeRestricted
      })
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

  // Error-card "Try again" (point 1): re-run the exact extraction that failed — same URL, same
  // method (handleExtract routes on useWhisperRef). Never clears the field. Falls back to the live
  // url state if no attempt was recorded yet.
  const handleRetry = () => {
    setError(null)
    const target = retryAttemptRef.current || url
    if (target) handleExtract(target)
  }

  const handleWhisperUpsell = async () => {
    if (!currentVideoId) return
    posthog.capture('whisper_upsell_clicked')

    setLoading(true)
    setIsReextracting(true)
    setError(null)
    setWhisperNetworkDisconnected(false)
    setTranscript(null)
    setWhisperStatus('idle')

    try {
      const formData = new FormData()
      formData.append('source_type', 'youtube')
      formData.append('video_id', currentVideoId)
      if (videoTitle) formData.append('title', videoTitle)

      const response = await fetch('/api/transcribe/whisper', { method: 'POST', body: formData })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'storage_full') {
          setError({ message: "Your library is full, so new transcriptions are paused. Delete some transcripts from your library, or buy more space on your Account page, then try again. No credits were charged.", errorType: 'storage_full' })
          setLoading(false)
          setWhisperStatus('idle')
          return
        }
        if (errorData.error === 'members_only') {
          setError({ message: "This video is members-only and cannot be transcribed by INDXR.AI.", isMembersOnly: true })
          setLoading(false)
          setWhisperStatus('idle')
          setIsStreaming(false)
          setIsReextracting(false)
          return
        }
        throw new Error(errorData.error || 'Failed to extract transcript with AI transcription')
      }

      const jobData = await response.json()
      if (!jobData.job_id) throw new Error('Failed to start transcription job')

      const isDedup = !!jobData.deduplicated
      const initialStatus = (isDedup ? jobData.status : 'pending') as WhisperStatus

      sessionStorage.setItem(VIDEO_JOB_KEY, JSON.stringify({
        jobId: jobData.job_id, videoId: currentVideoId,
        title: videoTitle, duration: videoDuration ?? 0,
        startTime: Date.now(), status: initialStatus,
      }))

      if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null }
      elapsedRef.current = 0
      setElapsedSeconds(0)
      setFinalElapsed(null)
      currentJobIdRef.current = jobData.job_id
      setIsStreaming(true)
      setWhisperStatus(initialStatus)
      intervalRef.current = setInterval(() => { elapsedRef.current += 1; setElapsedSeconds(s => s + 1) }, 1000)

      activeJobContextRef.current = { videoId: currentVideoId, title: videoTitle, context: 'upsell' }
      setIsAlreadyProcessing(isDedup)
      setActiveJobId(jobData.job_id)
      refreshCredits()  // ADR-050: reflect the reservation in the topbar immediately
      // Completion and error are handled by _handleWhisperComplete / _handleWhisperError
    } catch (err: unknown) {
      console.error('[WHISPER UPSELL] ERROR caught:', err)
      const errMsg = err instanceof Error ? err.message : 'Whisper extraction failed'
      const isYouTubeRestricted = errMsg.includes('152') || errMsg.toLowerCase().includes('unavailable')
      if (isYouTubeRestricted) {
        setError({ message: "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here.", isYouTubeRestricted: true })
      } else if (errMsg === 'no_speech_detected') {
        setError({ message: '', isNoSpeech: true })
      } else {
        setError({ message: errMsg })
      }
      setLoading(false)
      setWhisperStatus('idle')
      setIsStreaming(false)
      setIsReextracting(false)
    }
  }


  const handleVideoResume = () => {
    if (!videoResumeData) return
    const { jobId, videoId, title, startTime, status } = videoResumeData
    setVideoResumeData(null)

    const elapsedAtResume = Math.floor((Date.now() - startTime) / 1000)
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null }
    elapsedRef.current = elapsedAtResume
    setElapsedSeconds(elapsedAtResume)
    setFinalElapsed(null)
    currentJobIdRef.current = jobId
    setIsStreaming(true)
    setWhisperStatus(status)
    setLoading(true)
    intervalRef.current = setInterval(() => { elapsedRef.current += 1; setElapsedSeconds(s => s + 1) }, 1000)

    activeJobContextRef.current = { videoId, title, context: 'resume' }
    setActiveJobId(jobId)
    // Completion and error are handled by _handleWhisperComplete / _handleWhisperError
  }

  const handleGuardedTabSwitch = (callback: (() => void) | undefined) => {
    if (!callback) return
    if (isStreaming) {
      const confirmed = window.confirm(
        "A transcription is in progress. Are you sure you want to leave? Your transcript will still be saved."
      )
      if (!confirmed) return
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsStreaming(false)
      setWhisperStatus('idle')
    }
    callback()
  }

  // A saved result is showing → collapse the input to a single "New transcription" action (point 2).
  const hasResult = transcript !== null && transcript.length > 0

  // Point 3: the full "safe to close / can't be cancelled" info block (BackgroundJobNotice) is gone —
  // irreversibility already sits on the button before the click. What remains is one short reassurance
  // line inside the progress card itself, via JobProgressCard's `note` slot.
  const backgroundNote = (
    <p className="text-xs leading-snug text-fg-muted">
      Runs in the background — safe to close this tab; finished transcripts appear in your Library.
    </p>
  )

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      {/* Watchdog permanent failure notice — credits already refunded */}
      {watchdogRefundNotice && (
        <div
          aria-live="polite"
          className="mb-6 p-4 bg-surface border border-border rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted">
              We konden deze video niet verwerken na meerdere pogingen. Je credits zijn teruggestort.
            </p>
          </div>
          <button
            aria-label="Sluiten"
            onClick={() => setWatchdogRefundNotice(false)}
            className="text-fg-muted hover:text-fg shrink-0 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}
      {/* Video Job Resume Banner — shown when a running Whisper job is detected on mount */}
      {videoResumeData && !isStreaming && (
        <div
          aria-live="polite"
          className="mb-6 p-4 bg-accent/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent shrink-0">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">AI transcription in progress</p>
              <p className="text-xs text-fg-muted">
                {videoResumeData.title ? `"${videoResumeData.title}"` : 'A video'} is still being transcribed
              </p>
            </div>
          </div>
          <Button
            size="sm"
            aria-label="Resume transcription (activates automatically in 5 seconds)"
            onClick={() => {
              if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
              handleVideoResume()
            }}
            className="relative h-8 text-xs overflow-hidden shrink-0"
          >
            <span
              className="absolute inset-0 bg-white/20 origin-left"
              style={{
                transform: resumeBarActive ? 'scaleX(1)' : 'scaleX(0)',
                transition: resumeBarActive ? 'transform 5000ms linear' : 'none',
                transformOrigin: 'left',
              }}
            />
            <span className="relative">Resume</span>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 max-w-2xl mx-auto mb-6">
        {!hasResult && (<>
        <div className="flex gap-3">
          <div className="relative flex-1 min-w-0">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              className={cn(
                "h-12 bg-bg border-border text-fg transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
                error && "border-error focus-visible:ring-destructive"
              )}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !showDuplicateChoices && handleExtract()}
            />
           </div>

          {!showDuplicateChoices && (
            <Button
              size="lg"
              className="h-12 px-6 shrink-0 min-w-[132px] justify-center disabled:bg-[var(--surface-sunken)] disabled:text-[var(--fg-muted)] disabled:opacity-100"
              onClick={() => handleExtract()}
              disabled={loading || !url || isCheckingDuplicate}
            >
              {loading || isCheckingDuplicate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading && isFetchingMeta ? "Checking…" : loading ? "Extracting…" : isCheckingDuplicate ? "Checking…" : "Extract"}
            </Button>
          )}
        </div>

        {/* Transcription method — a real radio group (ADR-080), method colour from the Library
            tokens. Bound to the same useWhisper/useWhisperRef state; no state lift. The AI card
            stays visible for anonymous visitors but is gated via onAiRequiresAuth. The AI card's
            sub-line always reserves room for the balance, so selecting AI never shifts the layout. */}
        {!whisperAutoTriggered && !loading && !showWhisperConfirm && !showDuplicateChoices && (
          <MethodRadioCards
            value={useWhisper ? "ai" : "captions"}
            availableCredits={user ? credits : null}
            onChange={(next) => {
              if (next === "ai") {
                if (!user) { onAiRequiresAuth?.(); return }
                useWhisperRef.current = true
                posthog.capture('whisper_toggle_enabled')
                setUseWhisper(true)
              } else {
                useWhisperRef.current = false
                setUseWhisper(false)
              }
            }}
          />
        )}
        </>)}

        {hasResult && (
          <div className="flex justify-center">
            <Button variant="outline" className="h-10" onClick={handleNewTranscription}>
              <Plus className="h-4 w-4 mr-2" /> New transcription
            </Button>
          </div>
        )}

        {/* Cost block (B4, ADR-080) — the concrete total for THIS video, known once the
            metadata is fetched (before the reservation). The total is the biggest number here;
            the balance reads as secondary; the button carries the amount. Irreversibility sits
            right at the button, before the click. */}
        {showWhisperConfirm && pendingWhisperData && (() => {
          const cost = pendingWhisperData.creditsRequired
          const known = pendingWhisperData.duration > 0
          const enough = credits == null || credits >= cost
          return (
            <div className="overflow-hidden rounded-xl border border-border bg-surface animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  {/* wraps to two lines instead of hard-truncating on 390px (point 4) */}
                  <p className="text-sm text-fg [text-wrap:balance] line-clamp-2">{pendingWhisperData.title || videoTitle || "This video"}</p>
                  {known && <p className="mt-0.5 font-mono text-xs text-fg-muted">{formatElapsed(pendingWhisperData.duration)}</p>}
                </div>
                <MethodBadge method="ai" className="mt-0.5 shrink-0">AI transcription</MethodBadge>
              </div>
              <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
                <span className="font-medium">Total</span>
                <span className="text-[22px] font-semibold tabular-nums text-fg-strong">{known ? `${cost} credits` : `${cost}+ credits`}</span>
              </div>
              {/* balance on its own line; actions fill the width and stack on mobile (primary on top
                  via col-reverse), sit right on desktop — no cramped right-aligned cluster (point 4) */}
              <div className="flex flex-col gap-3 border-t border-border bg-surface-elevated px-4 py-3">
                <BalanceLine have={credits} cost={cost} />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={handleWhisperCancel} disabled={loading} className="h-10 w-full sm:w-auto">
                    Cancel
                  </Button>
                  {enough ? (
                    <Button onClick={handleWhisperConfirm} disabled={loading} className="h-10 w-full sm:w-auto">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Extract — {cost}{known ? "" : "+"} credits
                    </Button>
                  ) : (
                    <a href={appHref('/dashboard/credits')} className="w-full sm:w-auto">
                      <Button className="h-10 w-full">Buy credits</Button>
                    </a>
                  )}
                </div>
                <p className="text-xs text-fg-muted">Once started, this can&apos;t be cancelled.</p>
              </div>
            </div>
          )
        })()}

        {/* Duplicate pause-and-confirm prompt */}
        {existingTranscriptId && showDuplicateChoices && (
          <div className="px-1 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-sm text-warning-fg dark:text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">You already have this transcript in your library. Extract again?</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <a
                href={appHref(`/dashboard/library/${existingTranscriptId}`)}
                className="text-sm font-medium text-accent hover:underline"
              >
                View in Library
              </a>
              <span className="text-fg-muted/40 text-xs">·</span>
              <button
                className="text-sm text-fg-muted hover:text-fg hover:underline transition-colors"
                onClick={() => handleExtract()}
              >
                Extract anyway
              </button>
              <span className="text-fg-muted/40 text-xs">·</span>
              <button
                className="text-sm text-fg-muted hover:text-fg hover:underline transition-colors"
                onClick={() => setShowDuplicateChoices(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Soft info banner: shown when duplicate exists but prompt is not active */}
        {existingTranscriptId && !showDuplicateChoices && (
          <div className="px-1 -mt-1 flex items-center gap-1.5 text-sm text-warning-fg dark:text-amber-500 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {existingTranscriptMethod === 'whisper_ai' || existingTranscriptMethod === 'assemblyai'
                ? 'You already have this transcript (AI Transcription) — '
                : 'You already have this transcript in your library — '}
            </span>
            <a href={appHref(`/dashboard/library/${existingTranscriptId}`)} className="font-medium hover:underline">
              View in Library
            </a>
          </div>
        )}

        {/* Normal error text */}
        {!existingTranscriptId && !showDuplicateChoices && !showWhisperConfirm && (
          <div className="flex justify-between items-start px-1">
             {whisperNetworkDisconnected ? (
               <div className="p-3 rounded-lg bg-surface-elevated/60 border border-border flex items-start gap-2 w-full">
                 <AlertCircle className="h-4 w-4 text-fg-muted mt-0.5 shrink-0" />
                 <div>
                   <p className="text-sm text-fg/80">
                     Your transcript is still being processed. Check your Library in a few minutes — it will appear there when ready.
                   </p>
                   <a href={appHref('/dashboard/library')} className="text-xs text-accent hover:underline mt-1 inline-block">
                     Go to Library →
                   </a>
                 </div>
               </div>
             ) : error ? (
               (() => {
                 // Map VideoTab's error flags to a backend code, then render the one shared
                 // ErrorCard from the copy map (ADR-080). Presentation only — the state-setting,
                 // early returns and throws that produced `error` are untouched.
                 const errCode =
                   error.errorType ||
                   (error.isMembersOnly ? 'members_only'
                   : error.isNoSpeech ? 'no_speech'
                   : error.isYouTubeRestricted ? 'youtube_restricted'
                   : error.isCreditsError ? 'insufficient_credits'
                   : error.type === 'CHANNEL' ? 'channel_url'
                   : null)
                 const copy = resolveErrorCopy(errCode, {
                   fallbackMessage: error.message,
                   creditsRefunded: error.creditsRefunded,
                   availableCredits: user ? credits : null,
                   requiredCredits: error.requiredCredits ?? null,
                   aiCost: videoDuration ? Math.ceil(videoDuration / 60) : null,
                   billingHref: appHref('/dashboard/credits'),
                   libraryHref: appHref('/dashboard/library'),
                   accountHref: appHref('/dashboard/account'),
                   contactHref: user ? appHref('/dashboard/messages?tab=support') : marketingHref('/contact'),
                   onRetryUrl: handleRetry,
                   onUseAi: user ? handleWhisperUpsell : undefined,
                   onSwitchToAudio: onSwitchToAudio ? () => handleGuardedTabSwitch(onSwitchToAudio) : undefined,
                 })
                 // bot_detection (point 6): "Try again" is the primary action and usually clears the
                 // block; AI sits below as a different route, framed as prose (no priced button, no
                 // accent) so it doesn't read as "we're broken, pay us".
                 const note = errCode === 'bot_detection' && user ? (
                   <>Still blocked? <button type="button" onClick={handleWhisperUpsell} className="font-medium text-fg underline underline-offset-2 hover:text-fg-strong">Use AI transcription</button> — it works from the audio file instead of the route YouTube is blocking.</>
                 ) : undefined
                 return <ErrorCard className="w-full" {...copy} note={note} />
               })()
             ) : isAlreadyProcessing && loading && whisperStatus !== 'idle' ? (
               <div className="flex flex-col gap-2 w-full">
                 <div className="p-3 rounded-lg bg-surface-elevated/60 border border-border flex items-start gap-2">
                   <AlertCircle className="h-4 w-4 text-fg-muted mt-0.5 shrink-0" />
                   <p className="text-sm text-fg/80">This video is already being processed — showing the existing progress.</p>
                 </div>
                 <JobProgressCard
                   title={videoTitle}
                   status={whisperStatus}
                   elapsedSeconds={elapsedSeconds}
                   audioDurationSeconds={videoDuration}
                   downloadedBytes={downloadBytes}
                   totalBytes={downloadTotalBytes}
                   note={backgroundNote}
                 />
               </div>
             ) : loading && whisperStatus !== 'idle' ? (
               <div className="flex flex-col gap-2 w-full mt-2">
                 <JobProgressCard
                   title={videoTitle}
                   status={whisperStatus}
                   elapsedSeconds={elapsedSeconds}
                   audioDurationSeconds={videoDuration}
                   downloadedBytes={downloadBytes}
                   totalBytes={downloadTotalBytes}
                   note={backgroundNote}
                 />
               </div>
             ) : null}
          </div>
        )}
      </div>

      {/* Playlist Detection Banner */}
      {isPlaylistUrl && (
        <div className="mb-8 p-4 bg-accent/10 border border-primary/20 rounded-xl flex items-center justify-between text-left animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg text-accent">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-fg font-medium">Playlist detected</p>
              <p className="text-sm text-fg-muted">Would you like to switch to the Playlist tab to extract multiple videos?</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGuardedTabSwitch(onPlaylistDetected)}
            className="bg-bg hover:bg-surface-elevated"
          >
            Switch to Playlist
          </Button>
        </div>
      )}

      {/* Loading — caption extraction shows a live progress card in the family (point 3): captions
          used to sit behind a bare skeleton with no phase, time, or sign of life, so a slow or
          blocked fetch looked like nothing. The Whisper metadata pre-flight keeps the skeleton (the
          job's own progress card takes over the moment the job starts). */}
      {loading && !transcript && !isStreaming && (
        (!useWhisper && !isFetchingMeta && whisperStatus === 'idle') ? (
          <div className="w-full max-w-4xl mx-auto mt-8">
            <ResultCardShell
              header={
                <div className="flex items-center gap-2 min-w-0">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                  <p className="truncate text-sm font-semibold text-[var(--fg-strong)]">Fetching captions</p>
                  <span className="ml-auto shrink-0"><MethodBadge method="captions">YouTube captions</MethodBadge></span>
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-fg-muted">Reading YouTube&apos;s caption track</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full w-full rounded-full bg-accent/60 motion-safe:animate-pulse" />
                </div>
              </div>
            </ResultCardShell>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto mt-8">
            <CardSkeleton />
          </div>
        )
      )}

      {/* Transcript Display */}
      {transcript !== null && transcript.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">

          {/* One card for one result (point 1): the completion receipt is folded into
              TranscriptCard's header — checkmark + a single meta line + View in Library —
              instead of a separate green bar above it. Whisper only; captions are free. */}
          <TranscriptCard
                    transcript={transcript}
                    videoTitle={videoTitle}
                    videoUrl={videoUrl}
                    showSignupCard={showSignupCard}
                    videoId={currentVideoId || undefined}
                    durationSeconds={videoDuration ?? undefined}
                    extractionMethod={lastProcessingMethod === 'whisper_ai' ? 'assemblyai' : (lastProcessingMethod ?? undefined)}
                    channel={videoChannel ?? undefined}
                    language={videoLanguage ?? undefined}
                    publishedAt={videoPublishedAt ?? undefined}
                    languageDetected={languageDetected ?? undefined}
                    transcriptId={existingTranscriptId ?? existingTranscriptIdRef.current ?? undefined}
                    completion={
                      // AI path: shows the credit cost + elapsed. Caption path (point 7): same one
                      // card, but credits omitted (free) and no elapsed — "View in Library" only when
                      // the transcript was actually saved (logged-in user → existingTranscriptId).
                      saveStatus === 'saved' && whisperMetadata ? {
                        credits: whisperMetadata.creditsUsed,
                        durationSeconds: whisperMetadata.duration,
                        elapsedSeconds: finalElapsed,
                        libraryHref: appHref('/dashboard/library'),
                        warning: whisperMetadata.truncationWarning ?? null,
                      } : lastProcessingMethod === 'youtube_captions' ? {
                        durationSeconds: videoDuration,
                        libraryHref: (existingTranscriptId ?? existingTranscriptIdRef.current)
                          ? appHref('/dashboard/library')
                          : undefined,
                      } : undefined
                    }
                  />

          {/* Re-extract offer (point 8): one ignorable line BELOW the result — no amber (that's the
              product's primary-action colour), no ✨ icon, no separate balance/price lines. Whoever
              is happy scrolls past; whoever isn't has already read the transcript. */}
          {lastProcessingMethod === 'youtube_captions' && credits !== null && (() => {
             const requiredCredits = videoDuration ? Math.ceil(videoDuration / 60) : 1;
             const hasEnoughCredits = credits >= requiredCredits;
             return (
               <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-fg-muted">
                 <span>YouTube captions not accurate enough?</span>
                 {hasEnoughCredits ? (
                   <button
                     onClick={handleWhisperUpsell}
                     disabled={loading || isReextracting}
                     className="font-medium text-fg underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center"
                   >
                     {isReextracting
                       ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Extracting…</>
                       : `Re-extract with AI · ${requiredCredits} credit${requiredCredits !== 1 ? 's' : ''}`}
                   </button>
                 ) : (
                   <a href={appHref('/dashboard/credits')} className="font-medium text-fg underline-offset-2 hover:underline">
                     Re-extract with AI — top up credits
                   </a>
                 )}
               </div>
             );
          })()}
        </div>
      ) : null}

      {/* No Captions Warning */}
      {transcript !== null && transcript.length === 0 && !loading && (
        <div className="mb-8 p-4 bg-warning-subtle border border-warning/20 rounded-lg text-warning-fg dark:text-warning text-sm">
          No captions available for this video
        </div>
      )}

    </div>
  )
}
