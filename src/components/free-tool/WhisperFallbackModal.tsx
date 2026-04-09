"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { TranscriptItem } from "@/components/TranscriptCard"
import Link from "next/link"

interface WhisperFallbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  videoTitle: string
  estimatedDuration?: number
  onSuccess: (transcript: TranscriptItem[], metadata: { videoId: string; title: string; duration: number; creditsUsed: number; source: string }) => void
  onError: (error: string) => void
}

export function WhisperFallbackModal({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  estimatedDuration,
  onSuccess,
  onError
}: WhisperFallbackModalProps) {
  const { user, credits, refreshCredits } = useAuth()
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Calculate credit cost (1 credit = 10 minutes)
  const estimatedCredits = estimatedDuration 
    ? Math.ceil(estimatedDuration / 600) 
    : 1 // Default to 1 credit if duration unknown

  const hasEnoughCredits = credits !== null && credits >= estimatedCredits

  const handleTranscribe = async () => {
    if (!user) {
      onError("Please sign in to use AI transcription")
      onOpenChange(false)
      return
    }

    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append('source_type', 'youtube')
      formData.append('video_id', videoId)

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      })

      // Non-OK = pre-stream JSON error (auth, suspended, validation)
      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'members_only') {
          onError('This video is members-only and cannot be transcribed by INDXR.AI.')
          onOpenChange(false)
          return
        }
        onError(errorData.user_friendly_message || errorData.error || 'Transcription failed')
        onOpenChange(false)
        return
      }

      // Consume SSE stream (no status display needed in modal)
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalEvent: { type: string; transcript?: unknown[]; duration?: number; credits_used?: number; error?: string; code?: string; required_credits?: number; available_credits?: number } | null = null

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'complete' || event.type === 'error') {
              finalEvent = event
              break outer
            }
          } catch { /* ignore malformed lines */ }
        }
      }
      reader.releaseLock()

      if (!finalEvent || finalEvent.type === 'error') {
        if (finalEvent?.code === 'insufficient_credits') {
          onError(`Not enough credits. You need ${finalEvent.required_credits} credits but only have ${finalEvent.available_credits}.`)
          onOpenChange(false)
          return
        }
        onError(finalEvent?.error || 'Transcription failed')
        onOpenChange(false)
        return
      }

      // Refresh credit balance
      await new Promise(resolve => setTimeout(resolve, 500))
      await refreshCredits()

      // Call success callback
      onSuccess(finalEvent.transcript as TranscriptItem[], {
        videoId,
        title: videoTitle,
        duration: finalEvent.duration ?? 0,
        creditsUsed: finalEvent.credits_used ?? 1,
        source: 'whisper'
      })

      onOpenChange(false)

    } catch (error) {
      console.error('Whisper transcription error:', error)
      onError('Something went wrong. Please try again.')
      onOpenChange(false)
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-foreground">No Captions Found</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            This video doesn&apos;t have auto-generated captions. INDXR.AI will use Whisper AI to transcribe your video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Info */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-foreground truncate">{videoTitle}</p>
            {estimatedDuration && (
              <p className="text-xs text-muted-foreground mt-1">
                ~{Math.round(estimatedDuration / 60)} minutes
              </p>
            )}
          </div>

          {/* Credit Cost */}
          <div className="p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Credit Cost</span>
              <span className="text-lg font-bold text-foreground">{estimatedCredits} credits</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your balance</span>
              <span className={credits !== null && credits >= estimatedCredits ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}>
                {credits ?? 0} credits
              </span>
            </div>
          </div>

          {/* Insufficient Credits Warning */}
          {!hasEnoughCredits && credits !== null && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-700 dark:text-amber-200 font-medium">Not enough credits</p>
                <p className="text-xs text-amber-600 dark:text-amber-300/80 mt-1">
                  You need {estimatedCredits} credits but only have {credits}.
                </p>
                <Link href="/pricing" className="inline-block mt-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Buy Credits →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• AI transcription uses OpenAI&apos;s Whisper model</p>
            <p>• Credits are only charged after successful transcription</p>
            <p>• Processing takes 10-30 seconds depending on video length</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={isTranscribing}
          >
            Cancel
          </Button>

          {hasEnoughCredits ? (
            <Button
              onClick={handleTranscribe}
              disabled={isTranscribing || !user}
              className="w-full sm:w-auto"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Transcribe ({estimatedCredits} credits)
                </>
              )}
            </Button>
          ) : (
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button className="w-full">
                Buy Credits →
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
