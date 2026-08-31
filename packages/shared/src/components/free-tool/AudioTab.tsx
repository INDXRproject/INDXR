"use client"

import { useState, useRef, useEffect } from "react"
import { UploadCloud, FileAudio, X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { useAuth } from "../../hooks/useAuth"
import { CompletionReceipt } from "../ui/CompletionReceipt"
import { useCompletionReceipt } from "../../hooks/useCompletionReceipt"
import { useJobStatus } from "../../hooks/useJobStatus"
import { TranscriptCard, TranscriptItem } from "../TranscriptCard"
import { TranscriptMetadata } from "../../types/transcript"
import Link from "next/link"
import { marketingHref, appHref } from "../../lib/cross-host-links"
import { CardSkeleton } from "../ui/loading-skeleton"
import posthog from "posthog-js"
import { createClient } from "../../utils/supabase/client"
import { BackgroundJobNotice } from "../BackgroundJobNotice"
import { JobProgressCard } from "../transcribe/JobProgressCard"
import { MethodBadge } from "../transcribe/MethodBadge"
import { BalanceLine } from "../transcribe/CostBreakdown"
import { ErrorCard } from "../transcribe/ErrorCard"
import { resolveErrorCopy } from "../transcribe/errorCopy"
import { readJson, ResponseError } from "../../lib/http"
import { CREDIT_COSTS } from "../../lib/pricing"
import { idempotencyKey, clearIdempotencyKey } from "../../lib/idempotency"
import { UPLOAD_EXTENSIONS, UPLOAD_ACCEPT_ATTR, UPLOAD_FORMATS_LIST, UPLOAD_MAX_FILE_MB } from "../../lib/uploadFormats"

const AUDIO_JOB_KEY = 'indxr-active-audio-job'
// ADR-071 — DEEL 4: mirrors the server's AssemblyAI cap (backend/main.py MAX_TRANSCRIPTION_SECONDS).
// Client-side check blocks submit immediately using the duration already measured via
// getAudioDuration, instead of waiting on the server's 422 (duration_exceeds_max).
const MAX_AUDIO_DURATION_SECONDS = 10 * 3600

interface AudioTabProps {
  onTranscriptLoaded?: (transcript: TranscriptItem[], metadata: TranscriptMetadata) => void
}

export function AudioTab({ onTranscriptLoaded }: AudioTabProps) {
  const { user, credits, refreshCredits, loading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioMetadata, setAudioMetadata] = useState<{ filename: string; duration: number; creditsUsed: number; processingTimeSecs: number } | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isUploading, setIsUploading] = useState(false)
  const [whisperStatus, setWhisperStatus] = useState<'idle' | 'pending' | 'downloading' | 'transcribing' | 'saving'>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [resumeData, setResumeData] = useState<{ jobId: string; filename: string; initialStatus: string; elapsedAtResume: number } | null>(null)
  const [resumeBarActive, setResumeBarActive] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeFilenameRef = useRef<string>('Audio Upload')
  const [watchdogRefundNotice, setWatchdogRefundNotice] = useState(false)
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)

  // Active job tracked via Realtime + polling
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [completedJobId, setCompletedJobId] = useState<string | null>(null)  // for the completion receipt (RLS read)
  const receipt = useCompletionReceipt('transcription', completedJobId, saveStatus === 'saved')

  useJobStatus({
    jobId: activeJobId,
    jobType: 'transcription',
    onUpdate: (job) => {
      const s = job.status as typeof whisperStatus
      if (s === 'pending' || s === 'downloading' || s === 'transcribing' || s === 'saving') {
        setWhisperStatus(s)
      }
    },
    onComplete: (job) => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      sessionStorage.removeItem(AUDIO_JOB_KEY)
      setTranscript(job.transcript as TranscriptItem[])
      setAudioMetadata({
        filename: activeFilenameRef.current,
        duration: job.duration_seconds ?? 0,
        creditsUsed: job.credits_cost ?? 1,
        processingTimeSecs: job.processing_time_seconds ?? 0,
      })
      refreshCredits()
      window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
      setCompletedJobId(activeJobId)  // capture before nulling — feeds the completion receipt (RLS read)
      setSaveStatus('saved')
      setIsTranscribing(false)
      setWhisperStatus('idle')
      setUploadPhase('idle')
      setUploadProgress(null)
      setActiveJobId(null)
    },
    onError: (job) => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      sessionStorage.removeItem(AUDIO_JOB_KEY)
      if (job.error_message === 'Insufficient credits') {
        setError({ message: 'Not enough credits to transcribe this file.', code: 'insufficient_credits' })
      } else if (job.status !== 'network_error') {
        setError({ message: job.error_message || 'Transcription failed', code: job.error_type ?? undefined })
      }
      setIsTranscribing(false)
      setWhisperStatus('idle')
      setUploadPhase('idle')
      setUploadProgress(null)
      setActiveJobId(null)
    },
  })

  // On mount: check for a running audio job from a previous page session
  useEffect(() => {
    const raw = sessionStorage.getItem(AUDIO_JOB_KEY)
    if (!raw) return
    let jobId: string, filename: string
    try {
      const parsed = JSON.parse(raw)
      jobId = parsed.jobId
      filename = parsed.filename ?? 'Audio Upload'
    } catch {
      sessionStorage.removeItem(AUDIO_JOB_KEY)
      return
    }
    ;(async () => {
      try {
        const resp = await fetch(`/api/jobs/${jobId}`)
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
            sessionStorage.removeItem(AUDIO_JOB_KEY)
          } else {
            // Transient error — show banner optimistically; Resume will re-poll
            setResumeData({ jobId, filename, initialStatus: 'transcribing', elapsedAtResume: 0 })
          }
          return
        }
        const job = await resp.json()
        if (job.status === 'error' && job.error_type === 'watchdog_permanent_failure') {
          sessionStorage.removeItem(AUDIO_JOB_KEY)
          setWatchdogRefundNotice(true)
        } else if (job.status === 'complete' || job.status === 'error') {
          sessionStorage.removeItem(AUDIO_JOB_KEY)
        } else if (['pending', 'downloading', 'transcribing', 'saving'].includes(job.status)) {
          const elapsedAtResume = job.created_at
            ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000)
            : 0
          setResumeData({ jobId, filename, initialStatus: job.status, elapsedAtResume })
        } else {
          sessionStorage.removeItem(AUDIO_JOB_KEY)
        }
      } catch {
        // Network exception — keep key, show banner optimistically; Resume will re-poll
        setResumeData({ jobId, filename, initialStatus: 'transcribing', elapsedAtResume: 0 })
      }
    })()
  }, [])

  // beforeunload guard while transcription is active (upload + processing)
  useEffect(() => {
    if (!isTranscribing) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isTranscribing])

  // Auto-resume countdown: when resume banner appears, resume automatically after 5 s
  useEffect(() => {
    if (!resumeData || isTranscribing) {
      setResumeBarActive(false)
      return
    }
    setResumeBarActive(false)
    const raf = requestAnimationFrame(() => setResumeBarActive(true))
    autoResumeRef.current = setTimeout(handleResume, 5000)
    return () => {
      cancelAnimationFrame(raf)
      if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData, isTranscribing])

  // Get actual audio duration from file
  const getAudioDuration = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration)
      })
      audio.addEventListener('error', () => {
        reject(new Error('Failed to load audio metadata'))
      })
      audio.src = URL.createObjectURL(file)
    })
  }

  // Calculate credits from actual duration
  const calculateCredits = (durationInSeconds: number): number => {
    // 1 credit = 1 minute = 60 seconds
    return Math.ceil(durationInSeconds / 60)
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDuration = (durationSeconds?: number | null): string => {
    if (durationSeconds) {
      const minutes = Math.round(durationSeconds / 60)
      return `~${minutes} min`
    }
    // Fallback to file size estimate if duration not available
    return `estimating...`
  }

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  // Skeleton loading state
  if (loading) {
    return (
      <div className="mt-8">
        <CardSkeleton />
      </div>
    )
  }

  // Auth required message (no flash because loading state above)
  if (!user) {
    return (
      <div className="mt-8">
        <div className="p-8 rounded-lg border border-amber-500/50 bg-amber-500/10 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-fg mb-2">Authentication Required</h3>
          <p className="text-sm text-amber-200 mb-4">
            Please <a href={marketingHref('/login')} className="underline font-semibold">sign in</a> to transcribe your files.
          </p>
        </div>
      </div>
    )
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = async (selectedFile: File) => {
    setIsUploading(true)
    // Point 7: clear any stale error card before validating a fresh file. Without this, a previous
    // error (e.g. "unsupported file type") stayed pinned above a now-valid file + active Transcribe
    // button. One clear here, at the single entry point for a new file (drop and picker both route here).
    setError(null)

    // Check file type
    const validTypes: readonly string[] = UPLOAD_EXTENSIONS
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(fileExt)) {
      setError({ message: `Unsupported file type. Please use: ${validTypes.join(', ')}`, code: 'unsupported_file' })
      setIsUploading(false)
      return
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError({ message: `File too large (${formatFileSize(selectedFile.size)}). Maximum size is 500 MB.`, code: 'file_too_large' })
      setIsUploading(false)
      return
    }

    setFile(selectedFile)
    setTranscript(null) // Clear previous transcript

    // Track audio upload started
    posthog.capture('audio_upload_started', {
      file_type: fileExt,
      file_size_mb: selectedFile.size / (1024 * 1024)
    })

    // Get actual audio duration
    try {
      const duration = await getAudioDuration(selectedFile)
      setAudioDuration(duration)
    } catch (error) {
      console.error('Failed to get audio duration:', error)
      setAudioDuration(null) // Fall back to file size estimate
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setTranscript(null)
    setAudioDuration(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleResume = () => {
    if (!resumeData) return
    const { jobId, filename, initialStatus, elapsedAtResume } = resumeData
    const validStatuses = ['pending', 'downloading', 'transcribing', 'saving'] as const
    const status = (validStatuses as readonly string[]).includes(initialStatus)
      ? (initialStatus as typeof validStatuses[number])
      : 'transcribing'
    setResumeData(null)
    setIsTranscribing(true)
    setWhisperStatus(status)
    setElapsedSeconds(elapsedAtResume)
    intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    activeFilenameRef.current = filename
    setActiveJobId(jobId)
  }

  const handleTranscribe = async () => {
    if (!file || !user) return
    if (audioDuration !== null && audioDuration > MAX_AUDIO_DURATION_SECONDS) return

    setIsTranscribing(true)
    setWhisperStatus('pending')

    try {
      // Step 1: Preflight — auth, suspended check, rate limit (no file involved)
      const preflightRes = await fetch('/api/transcribe/preflight', { method: 'POST' })
      if (!preflightRes.ok) {
        // Point 4: never JSON.parse a non-JSON body. If the route is absent (404 HTML), readJson throws
        // a coded ResponseError → a clean card, never a raw SyntaxError.
        let msg = 'Request blocked. Please try again.'
        let code: string | undefined
        try {
          const preflightData = await readJson<{ error?: string }>(preflightRes)
          msg = preflightData.error || msg
        } catch (e) {
          if (e instanceof ResponseError) code = e.code
        }
        setError({ message: msg, code })
        return
      }

      // Step 2: Get Supabase JWT for direct Railway upload
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError({ message: 'Session expired. Please sign in again.', code: 'unauthorized' })
        return
      }

      // Step 3: POST file directly to Railway (bypasses Vercel 4.5MB body limit)
      // Using XHR instead of fetch() to get upload progress events
      const formData = new FormData()
      formData.append('source_type', 'upload')
      formData.append('audio_file', file)
      // Idempotency (ADR-019): één sleutel per upload-handeling. De backend bindt 'm bovendien aan de
      // content-hash, zodat één sleutel niet twee verschillende bestanden kan dekken.
      const _idemAction = `upload:${file.name}:${file.size}`
      formData.append('idempotency_key', idempotencyKey(_idemAction))

      const backendUrl = process.env.NEXT_PUBLIC_AUDIO_UPLOAD_URL || 'http://localhost:8000'

      setUploadPhase('uploading')
      const { status: httpStatus, data } = await new Promise<{
        status: number
        data: Record<string, unknown>
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${backendUrl}/api/transcribe/whisper`)
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress({ loaded: e.loaded, total: e.total })
          }
        }

        xhr.upload.addEventListener('loadend', () => {
          setUploadPhase('processing')
          setUploadProgress(null)
        })

        xhr.onload = () => {
          try {
            resolve({ status: xhr.status, data: JSON.parse(xhr.responseText) as Record<string, unknown> })
          } catch {
            reject(new Error('Invalid response from server'))
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed. Please check your connection.'))
        xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'))
        xhr.send(formData)
      })
      clearIdempotencyKey(_idemAction) // handeling afgerond (response terug)

      if (httpStatus !== 200 && httpStatus !== 201) {
        if (httpStatus === 413 && data.code === 'storage_full') {
          setError({ message: 'Your library is full, so new transcriptions are paused. Delete some transcripts from your library, or buy more space on your Account page, then try again. No credits were charged.', code: 'storage_full' })
          return
        }
        if (httpStatus === 402) {
          // Balance is read from useAuth at render time (ErrorCard ctx), never a copied server value.
          setError({ message: 'Not enough credits to transcribe this file.', code: 'insufficient_credits' })
          return
        }
        setError({ message: (data.user_friendly_message as string) || (data.error as string) || 'Transcription failed', code: (data.code as string | undefined) })
        return
      }

      const job_id = data.job_id as string | undefined
      if (!job_id) {
        setError({ message: 'Failed to start transcription job' })
        return
      }

      // Persist job so page refresh can recover it
      sessionStorage.setItem(AUDIO_JOB_KEY, JSON.stringify({ jobId: job_id, filename: file.name }))
      setResumeData(null)

      setElapsedSeconds(0)
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
      activeFilenameRef.current = file.name
      setActiveJobId(job_id)
      refreshCredits()  // ADR-050: reflect the reservation in the topbar immediately
      // Completion handled by useJobStatus onComplete/onError callbacks
    } catch (error) {
      console.error('Transcription error:', error)
      setError({ message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
      setIsTranscribing(false)
      setWhisperStatus('idle')
      setUploadPhase('idle')
      setUploadProgress(null)
    }
  }

  // Credit estimate only when we actually know the duration. The browser reads it from an <audio>
  // element (getAudioDuration), which fails for containers it can't decode — typically AVI and MKV.
  // A file-size heuristic would be wildly wrong for video (bytes ≠ minutes), so rather than show a
  // misleading number we show nothing and let the server compute the real cost from the duration it
  // probes. The server stays authoritative either way (it reserves + refunds).
  const estimatedCredits: number | null =
    file && audioDuration !== null ? calculateCredits(audioDuration) : null
  const hasEnoughCredits =
    credits !== null && (estimatedCredits === null || credits >= estimatedCredits)
  const isOverDurationCap = audioDuration !== null && audioDuration > MAX_AUDIO_DURATION_SECONDS
  const canTranscribe = file && user && hasEnoughCredits && !isTranscribing && !isUploading && !isOverDurationCap

  return (
    <div className="space-y-6">
      {/* Watchdog permanent failure notice — credits already refunded */}
      {watchdogRefundNotice && (
        <div
          aria-live="polite"
          className="p-4 bg-surface border border-border rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted">
              We couldn&apos;t process this file after several attempts. The credits held for it have been refunded to your balance.
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={() => setWatchdogRefundNotice(false)}
            className="text-fg-muted hover:text-fg shrink-0 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <ErrorCard
          {...resolveErrorCopy(error.code, {
            mode: "audio",
            fallbackMessage: error.message,
            availableCredits: user ? credits : null,
            billingHref: appHref('/dashboard/credits'),
            libraryHref: appHref('/dashboard/library'),
            accountHref: appHref('/dashboard/account'),
            contactHref: user ? appHref('/dashboard/messages?tab=support') : marketingHref('/contact'),
            loginHref: marketingHref('/login'),
            // "Try again" re-runs the same upload when a file is still selected (point 1); if the
            // error happened at file selection (too large / unsupported) there's nothing to re-run,
            // so it just clears the card and the picker stays ready.
            onRetryUrl: () => { setError(null); if (file) handleTranscribe() },
          })}
        />
      )}

      {/* Resume Banner — shown when a running job is detected on mount */}
      {resumeData && !isTranscribing && (
        <div
          aria-live="polite"
          className="p-4 bg-accent/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent shrink-0">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">Transcription in progress</p>
              <p className="text-xs text-fg-muted">
                &ldquo;{resumeData.filename}&rdquo; is still being transcribed
              </p>
            </div>
          </div>
          <Button
            size="sm"
            aria-label="Resume transcription (activates automatically in 5 seconds)"
            onClick={() => {
              if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
              handleResume()
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

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${isDragging
            ? 'border-primary bg-accent/10 scale-105'
            : file
              ? 'border-green-500/50 bg-success-subtle'
              : 'border-border bg-surface-elevated/10 hover:bg-surface-elevated/20 hover:border-border'
          }
          ${isUploading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT_ATTR}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {isUploading ? (
            <>
              <div className="p-4 bg-accent/10 rounded-full mb-4">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-fg mb-2">Processing file...</h3>
              <p className="text-fg-muted">Reading duration</p>
            </>
          ) : file ? (
            <>
              <div className="p-4 bg-success-subtle rounded-full mb-4">
                <FileAudio className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-fg mb-2">{file.name}</h3>
              <div className="flex gap-4 text-sm text-fg-muted mb-4">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatDuration(audioDuration)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile()
                }}
                className="text-fg-muted hover:text-fg"
              >
                <X className="h-4 w-4 mr-2" />
                Remove file
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-surface-elevated rounded-full mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-8 w-8 text-fg-muted" />
              </div>
              <h3 className="text-xl font-semibold text-fg mb-2">Upload a file</h3>
              <p className="text-fg-muted mb-2">Drag and drop your file here, or click to browse</p>
              <p className="text-sm text-fg-muted">Supported: {UPLOAD_FORMATS_LIST} (max {UPLOAD_MAX_FILE_MB}MB)</p>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-fg-muted">
        {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit per minute · minimum 1 credit
      </p>

      {/* Duration cap — AssemblyAI supports up to 10 hours per file (ADR-071 DEEL 4) */}
      {file && !transcript && isOverDurationCap && audioDuration !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">
            This audio is {(audioDuration / 3600).toFixed(1)} hours long. AI transcription supports up to 10 hours per file. Split it into shorter parts.
          </span>
        </div>
      )}

      {/* Credit cost (ADR-080) — indigo AI method (uploads always go via AssemblyAI), the
          total is the biggest number here, the balance reads as secondary, never amber. */}
      {file && !transcript && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{file.name}</p>
              {audioDuration !== null && (
                <p className="font-mono text-xs text-fg-muted">{formatDuration(audioDuration)}</p>
              )}
            </div>
            <MethodBadge method="ai">AI transcription</MethodBadge>
          </div>
          <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
            <span className="font-medium">Total</span>
            {estimatedCredits !== null ? (
              <span className="text-[20px] font-semibold tabular-nums text-fg-strong">
                {estimatedCredits} credit{estimatedCredits === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-sm text-fg-muted">Calculated from length after upload</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-elevated px-4 py-3">
            {estimatedCredits !== null ? (
              <>
                <BalanceLine have={credits} cost={estimatedCredits} />
                {!hasEnoughCredits && credits !== null && (
                  <a href={appHref('/dashboard/credits')} className="ml-auto">
                    <Button size="sm" className="h-9">Buy credits</Button>
                  </a>
                )}
              </>
            ) : (
              <span className="text-xs text-fg-muted">
                Your balance: {credits ?? "—"} credit{credits === 1 ? "" : "s"}. 1 credit per minute is
                charged after upload and refunded if it fails.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Transcribe Button / Upload Progress / Processing Status */}
      {(file || isTranscribing) && !transcript && (
        <>
          {/* Upload progress bar — shown while file bytes are being sent */}
          {uploadPhase === 'uploading' && (
            <div className="space-y-2">
              <Progress
                value={uploadProgress ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100) : 0}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-fg-muted">
                <span>
                  {uploadProgress
                    ? `Uploading ${formatBytes(uploadProgress.loaded)} / ${formatBytes(uploadProgress.total)}`
                    : 'Preparing upload...'}
                </span>
                <span className="font-mono">
                  {uploadProgress ? `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%` : ''}
                </span>
              </div>
              <p className="text-xs text-amber-500 text-center">Don&apos;t close this tab while uploading</p>
            </div>
          )}

          {/* Processing state — shown after upload completes, while AI transcribes */}
          {uploadPhase === 'processing' && (
            <div className="space-y-3 py-1">
              <JobProgressCard
                title={file?.name}
                status={whisperStatus === 'idle' ? 'pending' : whisperStatus}
                elapsedSeconds={elapsedSeconds}
                audioDurationSeconds={audioDuration}
              />
              <BackgroundJobNotice />
            </div>
          )}

          {/* Transcribe button — shown only when idle */}
          {uploadPhase === 'idle' && (
            <Button
              onClick={handleTranscribe}
              disabled={!canTranscribe}
              className="w-full disabled:bg-[var(--surface-sunken)] disabled:text-[var(--fg-muted)] disabled:opacity-100"
              size="lg"
            >
              {estimatedCredits !== null ? `Transcribe (${estimatedCredits} credits)` : "Transcribe"}
            </Button>
          )}
        </>
      )}

      {/* Transcript Display with TranscriptCard */}
      {transcript && transcript.length > 0 && audioMetadata && (
        <>
          {/* Completion receipt (ADR-050 fase 3) — State A normally; State C strip only on ffprobe-fallback overshoot */}
          {saveStatus === 'saved' && (
            <CompletionReceipt
              kind="upload"
              status="complete"
              headline="Transcript saved to library"
              used={audioMetadata.creditsUsed}
              reserved={receipt.reserved}
              refunded={receipt.refunded}
              durationSeconds={audioMetadata.duration}
              elapsedSeconds={audioMetadata.processingTimeSecs}
              libraryHref={appHref('/dashboard/library')}
              loading={receipt.loading}
            />
          )}

          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <TranscriptCard
              transcript={transcript}
              videoTitle={audioMetadata.filename}
              videoUrl=""
              durationSeconds={audioMetadata.duration || undefined}
              extractionMethod="assemblyai"
            />
          </div>
        </>
      )}

      {/* Auth Required Message */}
      {!user && (
        <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            Please <a href={marketingHref('/login')} className="underline font-semibold">sign in</a> to transcribe your files.
          </p>
        </div>
      )}
    </div>
  )
}
