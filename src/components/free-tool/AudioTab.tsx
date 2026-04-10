"use client"

import { useState, useRef } from "react"
import { UploadCloud, FileAudio, X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { TranscriptCard, TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import Link from "next/link"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import posthog from "posthog-js"

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
  const [audioMetadata, setAudioMetadata] = useState<{ filename: string; duration: number; creditsUsed: number } | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isUploading, setIsUploading] = useState(false)
  const [whisperStatus, setWhisperStatus] = useState<'idle' | 'pending' | 'downloading' | 'transcribing' | 'saving'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    // 1 credit = 10 minutes = 600 seconds
    return Math.ceil(durationInSeconds / 600)
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
          <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-sm text-amber-200 mb-4">
            Please <Link href="/login" className="underline font-semibold">sign in</Link> to use audio transcription.
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
      toast.error(`Unsupported file type. Please use: ${validTypes.join(', ')}`)
      setIsUploading(false)
      return
    }

    // Check file size (25MB limit)
    const maxSize = 25 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      toast.error(`File too large (${formatFileSize(selectedFile.size)}). Maximum size is 25 MB.`)
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

  const handleTranscribe = async () => {
    if (!file || !user) return

    setIsTranscribing(true)
    setWhisperStatus('pending')

    try {
      const formData = new FormData()
      formData.append('source_type', 'upload')
      formData.append('audio_file', file)

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(
            <div>
              <p className="font-semibold">Not enough credits</p>
              <p className="text-sm">You need {data.required_credits} credits but only have {data.available_credits}.</p>
              <Link href="/pricing" className="text-primary underline text-sm">
                Buy Credits →
              </Link>
            </div>
          )
          return
        }
        toast.error(data.user_friendly_message || data.error || 'Transcription failed')
        return
      }

      const { job_id } = data
      if (!job_id) {
        toast.error('Failed to start transcription job')
        return
      }

      // Poll until terminal state
      const POLL_INTERVAL_MS = 3000
      const MAX_POLLS = 200

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

        let job: {
          status: string
          transcript?: TranscriptItem[]
          duration?: number
          credits_used?: number
          error_message?: string
          required_credits?: number
          available_credits?: number
        }

        try {
          const resp = await fetch(`/api/jobs/${job_id}`)
          if (!resp.ok) {
            toast.error('Failed to check job status')
            return
          }
          job = await resp.json()
        } catch {
          toast.error('Network error while checking job status')
          return
        }

        if (
          job.status === 'pending' ||
          job.status === 'downloading' ||
          job.status === 'transcribing' ||
          job.status === 'saving'
        ) {
          setWhisperStatus(job.status as 'pending' | 'downloading' | 'transcribing' | 'saving')
        } else if (job.status === 'complete') {
          setTranscript(job.transcript!)
          setAudioMetadata({
            filename: file.name,
            duration: job.duration!,
            creditsUsed: job.credits_used!,
          })

          await new Promise(resolve => setTimeout(resolve, 500))
          await refreshCredits()

          setSaveStatus('saving')
          if (onTranscriptLoaded) {
            await onTranscriptLoaded(job.transcript!, {
              source: 'audio',
              title: file.name,
              duration: job.duration!,
              creditsUsed: job.credits_used!,
              processingMethod: 'whisper_ai',
              filename: file.name,
            })
            setSaveStatus('saved')
          }
          return
        } else if (job.status === 'error') {
          if (job.error_message === 'Insufficient credits') {
            toast.error('Not enough credits to transcribe this file.')
          } else {
            toast.error(job.error_message || 'Transcription failed')
          }
          return
        }
      }

      toast.error('Transcription timed out. Please try again.')

    } catch (error) {
      console.error('Transcription error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsTranscribing(false)
      setWhisperStatus('idle')
    }
  }

  const estimatedCredits = file 
    ? (audioDuration ? calculateCredits(audioDuration) : Math.ceil((file.size / (1024 * 1024)) / 10) || 1)
    : 0
  const hasEnoughCredits = credits !== null && credits >= estimatedCredits
  const canTranscribe = file && user && hasEnoughCredits && !isTranscribing && !isUploading

  return (
    <div className="mt-8 space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-105' 
            : file 
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/20 hover:border-zinc-700'
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
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Processing file...</h3>
              <p className="text-muted-foreground">Reading audio duration</p>
            </>
          ) : file ? (
            <>
              <div className="p-4 bg-green-500/10 rounded-full mb-4">
                <FileAudio className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{file.name}</h3>
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
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
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Remove file
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-zinc-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Audio File</h3>
              <p className="text-muted-foreground mb-2">Drag and drop your audio file here, or click to browse</p>
              <p className="text-sm text-muted-foreground">Supported: MP3, WAV, M4A, OGG, FLAC (max 25MB)</p>
            </>
          )}
        </div>
      </div>

      {/* Credit Cost Preview */}
      {file && (
        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Credit Cost</h4>
              <p className="text-sm text-muted-foreground">
                This will use <span className="font-semibold text-foreground">{estimatedCredits} credits</span> ({formatDuration(audioDuration)})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
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
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="mt-3 w-full">
                Buy Credits →
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Transcribe Button */}
      {file && (
        <Button
          onClick={handleTranscribe}
          disabled={!canTranscribe}
          className="w-full"
          size="lg"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {whisperStatus === 'pending' ? 'Uploading...'
                : whisperStatus === 'downloading' ? 'Processing audio...'
                : whisperStatus === 'transcribing' ? 'Transcribing with AI...'
                : whisperStatus === 'saving' ? 'Saving...'
                : 'Processing...'}
            </>
          ) : (
            <>
              Transcribe ({estimatedCredits} credits)
            </>
          )}
        </Button>
      )}

      {/* Transcript Display with TranscriptCard */}
      {transcript && transcript.length > 0 && audioMetadata && (
        <>
          {/* Persistent Save Status Message */}
          {saveStatus === 'saved' && (
            <div className="mb-4 p-4 rounded-lg border border-green-500/50 bg-green-500/10 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-green-400">Transcript saved to library</p>
                  <p className="text-xs text-green-300/70">Used {audioMetadata.creditsUsed} credits • {Math.round(audioMetadata.duration / 60)} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/library">
                  <Button variant="outline" size="sm" className="text-green-400 border-green-500/50 hover:bg-green-500/10">
                    View in Library
                  </Button>
                </Link>
                <button
                  onClick={() => setSaveStatus('idle')}
                  className="p-1 hover:bg-green-500/20 rounded transition-colors text-green-400"
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
            />
          </div>
        </>
      )}

      {/* Auth Required Message */}
      {!user && (
        <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            Please <Link href="/login" className="underline font-semibold">sign in</Link> to use audio transcription.
          </p>
        </div>
      )}
    </div>
  )
}
