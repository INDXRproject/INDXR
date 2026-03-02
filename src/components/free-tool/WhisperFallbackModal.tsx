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

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Handle insufficient credits
        if (response.status === 402) {
          onError(`Not enough credits. You need ${data.required_credits} credits but only have ${data.available_credits}.`)
          onOpenChange(false)
          return
        }

        // Other errors
        onError(data.user_friendly_message || data.error || 'Transcription failed')
        onOpenChange(false)
        return
      }

      // Refresh credit balance
      await new Promise(resolve => setTimeout(resolve, 500))
      await refreshCredits()

      // Call success callback with credits used
      onSuccess(data.transcript, {
        videoId,
        title: videoTitle,
        duration: data.duration,
        creditsUsed: data.credits_used,
        source: 'whisper'
      })

      // Close modal
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
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <DialogTitle className="text-white">No Captions Found</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            This video doesn&apos;t have auto-generated captions. INDXR.AI will use Whisper AI to transcribe your video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Info */}
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm font-medium text-white truncate">{videoTitle}</p>
            {estimatedDuration && (
              <p className="text-xs text-zinc-500 mt-1">
                ~{Math.round(estimatedDuration / 60)} minutes
              </p>
            )}
          </div>

          {/* Credit Cost */}
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Credit Cost</span>
              <span className="text-lg font-bold text-white">{estimatedCredits} credits</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Your balance</span>
              <span className={credits !== null && credits >= estimatedCredits ? "text-green-500" : "text-amber-500"}>
                {credits ?? 0} credits
              </span>
            </div>
          </div>

          {/* Insufficient Credits Warning */}
          {!hasEnoughCredits && credits !== null && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-200 font-medium">Not enough credits</p>
                <p className="text-xs text-amber-300/80 mt-1">
                  You need {estimatedCredits} credits but only have {credits}.
                </p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-zinc-500 space-y-1">
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
            <Link href="/account/credits" className="w-full sm:w-auto">
              <Button className="w-full">
                Purchase Credits
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
