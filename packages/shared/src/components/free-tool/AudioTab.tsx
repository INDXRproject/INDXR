"use client"

import { useState, useRef, useEffect } from "react"
import { UploadCloud, FileAudio, X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { useAuth } from "../../hooks/useAuth"
import { useJobStatus } from "../../hooks/useJobStatus"
import { TranscriptCard, TranscriptItem } from "../TranscriptCard"
import { TranscriptMetadata } from "../../types/transcript"
import Link from "next/link"
import { marketingHref, appHref } from "../../lib/cross-host-links"
import { CardSkeleton } from "../ui/loading-skeleton"
import posthog from "posthog-js"
import { createClient } from "../../utils/supabase/client"
import { TranscriptionProgress } from "../transcription/TranscriptionProgress"
import { BackgroundJobNotice } from "../BackgroundJobNotice"

const AUDIO_JOB_KEY = 'indxr-active-audio-job'

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
  const [error, setError] = useState<string | null>(null)

  // Active job tracked via Realtime + polling
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

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
        duration: job.duration ?? 0,
        creditsUsed: job.credits_used ?? 1,
        processingTimeSecs: job.processing_time_seconds ?? 0,
      })
      refreshCredits()
      window.dispatchEvent(new CustomEvent('indxr-library-refresh'))
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
        setError('Not enough credits to transcribe this file.')
      } else if (job.status !== 'network_error') {
        setError(job.error_message || 'Transcription failed')
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
            Please <a href={marketingHref('/login')} className="underline font-semibold">sign in</a> to use audio transcription.
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

    // Check file type
    const validTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.mp4', '.mpeg', '.mpga', '.webm']
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(fileExt)) {
      setError(`Unsupported file type. Please use: ${validTypes.join(', ')}`)
      setIsUploading(false)
      return
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError(`File too large (${formatFileSize(selectedFile.size)}). Maximum size is 500 MB.`)
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

    setIsTranscribing(true)
    setWhisperStatus('pending')

    try {
      // Step 1: Preflight — auth, suspended check, rate limit (no file involved)
      const preflightRes = await fetch('/api/transcribe/preflight', { method: 'POST' })
      if (!preflightRes.ok) {
        const preflightData = await preflightRes.json()
        setError(preflightData.error || 'Request blocked. Please try again.')
        return
      }

      // Step 2: Get Supabase JWT for direct Railway upload
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Session expired. Please sign in again.')
        return
      }

      // Step 3: POST file directly to Railway (bypasses Vercel 4.5MB body limit)
      // Using XHR instead of fetch() to get upload progress events
      const formData = new FormData()
      formData.append('source_type', 'upload')
      formData.append('audio_file', file)

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

      if (httpStatus !== 200 && httpStatus !== 201) {
        if (httpStatus === 402) {
          setError(`Not enough credits — you need ${data.required_credits as number} but have ${data.available_credits as number}. Buy more at /pricing.`)
          return
        }
        setError((data.user_friendly_message as string) || (data.error as string) || 'Transcription failed')
        return
      }

      const job_id = data.job_id as string | undefined
      if (!job_id) {
        setError('Failed to start transcription job')
        return
      }

      // Persist job so page refresh can recover it
      sessionStorage.setItem(AUDIO_JOB_KEY, JSON.stringify({ jobId: job_id, filename: file.name }))
      setResumeData(null)

      setElapsedSeconds(0)
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
      activeFilenameRef.current = file.name
      setActiveJobId(job_id)
      // Completion handled by useJobStatus onComplete/onError callbacks
    } catch (error) {
      console.error('Transcription error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      setIsTranscribing(false)
      setWhisperStatus('idle')
      setUploadPhase('idle')
      setUploadProgress(null)
    }
  }

  const estimatedCredits = file
    ? (audioDuration ? calculateCredits(audioDuration) : Math.ceil((file.size / (1024 * 1024)) / 10) || 1)
    : 0
  const hasEnoughCredits = credits !== null && credits >= estimatedCredits
  const canTranscribe = file && user && hasEnoughCredits && !isTranscribing && !isUploading

  return (
    <div className="mt-8 space-y-6">
      {/* Watchdog permanent failure notice — credits already refunded */}
      {watchdogRefundNotice && (
        <div
          aria-live="polite"
          className="p-4 bg-surface border border-border rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted">
              We konden dit bestand niet verwerken na meerdere pogingen. Je credits zijn teruggestort.
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
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
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
              <p className="text-sm font-semibold text-fg">Audio transcription in progress</p>
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
          accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4,.mpeg,.mpga,.webm"
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
              <p className="text-fg-muted">Reading audio duration</p>
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
              <h3 className="text-xl font-semibold text-fg mb-2">Upload Audio File</h3>
              <p className="text-fg-muted mb-2">Drag and drop your audio file here, or click to browse</p>
              <p className="text-sm text-fg-muted">Supported: MP3, MP4, WAV, M4A, OGG, FLAC, WEBM (max 500MB)</p>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-fg-muted">
        1 credit per minute of audio. Minimum 1 credit.
      </p>

      {/* Credit Cost Preview */}
      {file && !transcript && (
        <div className="p-4 rounded-lg border border-border bg-surface-elevated">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-fg mb-1">Credit Cost</h4>
              <p className="text-sm text-fg-muted">
                This will use <span className="font-semibold text-fg">{estimatedCredits} credits</span> ({formatDuration(audioDuration)})
              </p>
              <p className="text-xs text-fg-muted mt-1">
                Your balance: {credits ?? 0} credits
              </p>
            </div>

            {!hasEnoughCredits && credits !== null && (
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Not enough credits</span>
              </div>
            )}
          </div>

          {!hasEnoughCredits && credits !== null && (
            <a href={marketingHref('/pricing')}>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                Buy Credits →
              </Button>
            </a>
          )}
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
              <TranscriptionProgress
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
              className="w-full"
              size="lg"
            >
              Transcribe ({estimatedCredits} credits)
            </Button>
          )}
        </>
      )}

      {/* Transcript Display with TranscriptCard */}
      {transcript && transcript.length > 0 && audioMetadata && (
        <>
          {/* Persistent Save Status Message */}
          {saveStatus === 'saved' && (
            <div className="mb-4 p-4 rounded-lg border border-green-500/50 bg-success-subtle flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-success">Transcript saved to library</p>
                  <p className="text-xs text-success/70">
                    Used {audioMetadata.creditsUsed} credits • {audioMetadata.creditsUsed} min
                    {audioMetadata.processingTimeSecs > 0 && (
                      <> • Completed in {Math.floor(audioMetadata.processingTimeSecs / 60)}:{String(audioMetadata.processingTimeSecs % 60).padStart(2, '0')}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={appHref('/dashboard/library')}>
                  <Button variant="outline" size="sm" className="text-success border-green-500/50 hover:bg-success-subtle">
                    View in Library
                  </Button>
                </a>
                <button
                  onClick={() => setSaveStatus('idle')}
                  className="p-1 hover:bg-success-subtle rounded transition-colors text-success"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
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
            Please <a href={marketingHref('/login')} className="underline font-semibold">sign in</a> to use audio transcription.
          </p>
        </div>
      )}
    </div>
  )
}
