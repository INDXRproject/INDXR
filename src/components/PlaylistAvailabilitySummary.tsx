import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Coins, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface PlaylistAvailabilitySummaryProps {
  results: VideoAvailability[]
  summary: AvailabilitySummary
  userCredits: number | null
  onProceed: () => void
  onCancel: () => void
}

export function PlaylistAvailabilitySummary({ results, summary, userCredits, onProceed, onCancel }: PlaylistAvailabilitySummaryProps) {
  const [expandedSection, setExpandedSection] = useState<'captions' | 'unavailable' | null>('unavailable')
  
  const hasEnoughCredits = userCredits === null || userCredits >= summary.totalCredits
  const remainingCredits = userCredits !== null ? userCredits - summary.totalCredits : null

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

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 my-6 shadow-2xl shadow-black/50">
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
        <h3 className="text-lg font-semibold text-white mb-1">Availability Breakdown</h3>
        <p className="text-sm text-zinc-400">Review extraction details before proceeding</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Has Captions */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-400">Free</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{summary.hasCaptions}</div>
            <div className="text-sm text-zinc-400">videos with auto-captions</div>
          </div>

          {/* Needs Whisper */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-amber-400">Whisper AI</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{summary.needsWhisper}</div>
            <div className="text-sm text-zinc-400">{summary.totalCredits} credits required</div>
          </div>

          {/* Unavailable */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-red-400">Unavailable</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{summary.unavailable}</div>
            <div className="text-sm text-zinc-400">videos will be skipped</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
             {/* Needs Whisper List (Always visible if present) */}
             {summary.needsWhisper > 0 && (
                <div className="border border-amber-500/20 rounded-xl overflow-hidden bg-amber-500/5">
                  <div className="px-4 py-3 border-b border-amber-500/10 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-amber-200">
                        {summary.needsWhisper} videos needing Whisper AI ({summary.totalCredits} credits)
                      </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {whisperVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                          <div className="relative h-10 w-16 rounded overflow-hidden shrink-0 border border-white/5">
                            <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-zinc-200 truncate font-medium">{video.title}</p>
                             <p className="text-xs text-amber-500/80">
                               {Math.floor(video.duration / 60)}:{Math.floor(video.duration % 60).toString().padStart(2, '0')} • {video.estimatedCredits} credits
                             </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
             )}

            {/* Unavailable List (Expandable) */}
            {summary.unavailable > 0 && (
                <div className="border border-red-500/20 rounded-xl overflow-hidden bg-red-500/5">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'unavailable' ? null : 'unavailable')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-300">
                            {summary.unavailable} unavailable videos (skipped)
                        </span>
                    </div>
                    {expandedSection === 'unavailable' ? <ChevronUp className="h-4 w-4 text-red-400"/> : <ChevronDown className="h-4 w-4 text-red-400"/>}
                  </button>
                  
                  {expandedSection === 'unavailable' && (
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1 border-t border-red-500/10">
                      {unavailableVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-zinc-300 truncate">{video.title}</p>
                             <p className="text-xs text-red-400 flex items-center gap-1">
                               <XCircle className="h-3 w-3" />
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

        {/* Action Bar */}
        <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 w-full md:w-auto">
               <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Your Balance:</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 rounded-md border border-white/5">
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span className={hasEnoughCredits ? "text-green-400 font-bold" : "text-amber-500 font-bold"}>
                          {userCredits ?? 0}
                      </span>
                  </div>
               </div>
               {hasEnoughCredits ? (
                   <p className="text-xs text-zinc-500">
                       After extraction: <span className="text-zinc-300 font-medium">{remainingCredits} credits</span>
                   </p>
               ) : (
                   <p className="text-xs text-red-400 font-medium">Insufficient credits</p>
               )}
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <Button variant="outline" onClick={onCancel} className="flex-1 md:flex-none border-zinc-700 hover:bg-zinc-800">
                    Cancel
                </Button>
                <Button 
                    onClick={onProceed} 
                    disabled={!hasEnoughCredits && summary.totalCredits > 0} // Prevent if broke, allow if free
                    className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg shadow-primary/20"
                >
                    Extract Selected ({summary.totalCredits} credits)
                </Button>
            </div>
        </div>
      </div>
    </div>
  )
}
