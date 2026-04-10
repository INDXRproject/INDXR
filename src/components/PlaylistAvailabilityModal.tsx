"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp, Coins } from "lucide-react"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import Link from "next/link"

interface VideoAvailability {
  videoId: string
  title: string
  duration: number
  thumbnail: string
  status: 'has_captions' | 'needs_whisper' | 'unavailable'
  estimatedCredits: number
  reason?: string
  errorType?: 'deleted' | 'private' | 'geo_blocked' | 'member_only' | 'restricted' | 'unknown'
}

interface AvailabilitySummary {
  total: number
  hasCaptions: number
  needsWhisper: number
  unavailable: number
  totalCredits: number
}

interface PlaylistAvailabilityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: VideoAvailability[]
  summary: AvailabilitySummary
  userCredits: number | null
  onProceed: () => void
}

export function PlaylistAvailabilityModal({
  open,
  onOpenChange,
  results,
  summary,
  userCredits,
  onProceed
}: PlaylistAvailabilityModalProps) {
  const [expandedSection, setExpandedSection] = useState<'captions' | 'whisper' | 'unavailable' | null>('whisper')

  const hasEnoughCredits = userCredits !== null && userCredits >= summary.totalCredits
  const remainingCredits = userCredits !== null ? userCredits - summary.totalCredits : 0

  const captionVideos = results.filter(r => r.status === 'has_captions')
  const whisperVideos = results.filter(r => r.status === 'needs_whisper')
  const unavailableVideos = results.filter(r => r.status === 'unavailable')

  const getErrorTypeLabel = (errorType?: string) => {
    switch (errorType) {
      case 'deleted': return 'Deleted'
      case 'private': return 'Private'
      case 'geo_blocked': return 'Geo-blocked'
      case 'member_only': return 'Members Only'
      case 'restricted': return 'Age Restricted'
      default: return 'Unavailable'
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Playlist Availability Check</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review which videos can be extracted and estimated credit cost
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* Has Captions */}
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-green-400 truncate">Free</span>
                </div>
                <div className="text-2xl font-bold text-white truncate">{summary.hasCaptions}</div>
                <div className="text-xs text-zinc-400 truncate">Auto-captions</div>
              </div>

              {/* Needs Whisper */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-amber-400 truncate">AI Transcription</span>
                </div>
                <div className="text-2xl font-bold text-white truncate">{summary.needsWhisper}</div>
                <div className="text-xs text-zinc-400 truncate">{summary.totalCredits} credits</div>
              </div>

              {/* Unavailable */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-sm font-medium text-red-400 truncate">Unavailable</span>
                </div>
                <div className="text-2xl font-bold text-white truncate">{summary.unavailable}</div>
                <div className="text-xs text-zinc-400 truncate">Will be skipped</div>
              </div>
            </div>

            {/* Expandable Lists */}
            <div className="space-y-2">
              {/* Has Captions List */}
              {summary.hasCaptions > 0 && (
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'captions' ? null : 'captions')}
                    className="w-full p-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-white">
                        {summary.hasCaptions} videos with auto-captions (free)
                      </span>
                    </div>
                    {expandedSection === 'captions' ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                  {expandedSection === 'captions' && (
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                      {captionVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-2 p-2 rounded bg-zinc-900/30">
                          <div className="relative h-10 w-16 rounded overflow-hidden shrink-0">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-200 truncate">{video.title}</p>
                            <p className="text-xs text-zinc-500">{formatDuration(video.duration)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Needs Whisper List */}
              {summary.needsWhisper > 0 && (
                <div className="border border-amber-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'whisper' ? null : 'whisper')}
                    className="w-full p-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-white">
                        {summary.needsWhisper} videos need AI Transcription ({summary.totalCredits} credits)
                      </span>
                    </div>
                    {expandedSection === 'whisper' ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                  {expandedSection === 'whisper' && (
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                      {whisperVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-2 p-2 rounded bg-amber-500/5">
                          <div className="relative h-10 w-16 rounded overflow-hidden shrink-0">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-200 truncate">{video.title}</p>
                            <p className="text-xs text-zinc-500">
                              {formatDuration(video.duration)} • {video.estimatedCredits} {video.estimatedCredits === 1 ? 'credit' : 'credits'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Unavailable List */}
              {summary.unavailable > 0 && (
                <div className="border border-red-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'unavailable' ? null : 'unavailable')}
                    className="w-full p-3 bg-red-500/5 hover:bg-red-500/10 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-white">
                        {summary.unavailable} videos unavailable
                      </span>
                    </div>
                    {expandedSection === 'unavailable' ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                  {expandedSection === 'unavailable' && (
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                      {unavailableVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-2 p-2 rounded bg-red-500/5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-200 truncate">{video.title}</p>
                            <p className="text-xs text-red-400">
                              {getErrorTypeLabel(video.errorType)}: {video.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Credit Summary */}
            {summary.totalCredits > 0 && (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Total Credit Cost:</span>
                  <span className="text-white font-bold">{summary.totalCredits} credits</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Your Balance:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-yellow-500" />
                    <span className={userCredits !== null && userCredits >= summary.totalCredits ? "text-green-500 font-medium" : "text-amber-500 font-medium"}>
                      {userCredits ?? 0} credits
                    </span>
                  </div>
                </div>
                {hasEnoughCredits && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">After Extraction:</span>
                    <span className="text-white font-medium">{remainingCredits} credits</span>
                  </div>
                )}
              </div>
            )}

            {/* Insufficient Credits Warning */}
            {!hasEnoughCredits && summary.totalCredits > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-200 font-medium">Not enough credits</p>
                  <p className="text-xs text-amber-300/80 mt-1">
                    You need {summary.totalCredits} credits but only have {userCredits ?? 0}.
                    Videos requiring Whisper will be skipped.
                  </p>
                  <Link href="/pricing" className="inline-block mt-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Buy Credits →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onProceed()
              onOpenChange(false)
            }}
            disabled={summary.hasCaptions === 0 && summary.needsWhisper === 0}
            className="flex-1"
          >
            {summary.totalCredits > 0 ? `Proceed (${summary.totalCredits} credits)` : 'Proceed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
