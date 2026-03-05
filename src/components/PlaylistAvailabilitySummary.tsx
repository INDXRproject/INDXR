import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Coins, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface VideoAvailability {
  videoId: string
  title: string
  duration: number
  thumbnail: string
  status: 'has_captions' | 'needs_whisper' | 'unavailable'
  estimatedCredits: number
  reason?: string
  errorType?: 'deleted' | 'private' | 'geo_blocked' | 'member_only' | 'restricted' | 'unknown'
  isDuplicate?: boolean
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
  summary?: AvailabilitySummary // Mark as optional and keep for backward compat if needed, but not used now
  userCredits: number | null
  existingDuplicates: Record<string, string>
  onProceed: (results: VideoAvailability[], duplicateAction?: 'replace' | 'reset') => void
  onCancel: () => void
}

export function PlaylistAvailabilitySummary({ results, userCredits, existingDuplicates, onProceed, onCancel }: PlaylistAvailabilitySummaryProps) {
  const [expandedSection, setExpandedSection] = useState<'captions' | 'unavailable' | null>('unavailable')
  
  // Track local results for Whisper toggling
  const [localResults, setLocalResults] = useState<VideoAvailability[]>(() => {
    return results.map(r => ({
      ...r,
      isDuplicate: !!existingDuplicates[r.videoId]
    }))
  })

  // Duplicate Action selection
  const containsDuplicates = localResults.some(r => r.isDuplicate && r.status !== 'unavailable')
  const [duplicateAction, setDuplicateAction] = useState<'replace' | 'reset'>('replace')

  // Live recalculate summary
  const currentSummary = {
    total: localResults.length,
    hasCaptions: localResults.filter(r => r.status === 'has_captions').length,
    needsWhisper: localResults.filter(r => r.status === 'needs_whisper').length,
    unavailable: localResults.filter(r => r.status === 'unavailable').length,
    totalCredits: localResults.filter(r => r.status === 'needs_whisper').reduce((acc, curr) => acc + curr.estimatedCredits, 0)
  }

  const hasEnoughCredits = userCredits === null || userCredits >= currentSummary.totalCredits
  const remainingCredits = userCredits !== null ? userCredits - currentSummary.totalCredits : null

  const captionVideos = localResults.filter(r => r.status === 'has_captions')
  const whisperVideos = localResults.filter(r => r.status === 'needs_whisper')
  const unavailableVideos = localResults.filter(r => r.status === 'unavailable')

  const toggleAllWhisper = (useWhisper: boolean) => {
    setLocalResults(prev => prev.map(r => {
      if (r.status === 'unavailable') return r
      if (useWhisper) {
        return {
          ...r,
          status: 'needs_whisper',
          estimatedCredits: Math.max(1, Math.ceil((r.duration / 60) / 10)) // 1 credit per 10min
        }
      } else {
        return {
          ...r,
          status: 'has_captions',
          estimatedCredits: 0
        }
      }
    }))
  }

  const toggleSingleWhisper = (videoId: string, useWhisper: boolean) => {
    setLocalResults(prev => prev.map(r => {
      if (r.videoId !== videoId) return r
      if (useWhisper) {
        return {
          ...r,
          status: 'needs_whisper',
          estimatedCredits: Math.max(1, Math.ceil((r.duration / 60) / 10)) // 1 credit per 10min
        }
      } else {
        return {
          ...r,
          status: 'has_captions',
          estimatedCredits: 0
        }
      }
    }))
  }

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
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 my-6 shadow-lg">
      <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
        <div>
           <h3 className="text-lg font-semibold text-foreground mb-1">Availability Breakdown</h3>
           <p className="text-sm text-muted-foreground">Review extraction details before proceeding</p>
        </div>
        
        {/* Global Whisper Toggle */}
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Use Whisper AI for all</span>
            <div 
              onClick={() => toggleAllWhisper(currentSummary.hasCaptions > 0)}
              className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${currentSummary.hasCaptions === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background shadow-sm transition-transform ${currentSummary.hasCaptions === 0 ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Has Captions */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-600 dark:text-green-400">Free</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{currentSummary.hasCaptions}</div>
            <div className="text-sm text-muted-foreground">videos with auto-captions</div>
          </div>

          {/* Needs Whisper */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">Whisper AI</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{currentSummary.needsWhisper}</div>
            <div className="text-sm text-muted-foreground">{currentSummary.totalCredits} credits required</div>
          </div>

          {/* Unavailable */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400">Unavailable</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{currentSummary.unavailable}</div>
            <div className="text-sm text-muted-foreground">videos will be skipped</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
             {/* Needs Whisper List */}
             {currentSummary.needsWhisper > 0 && (
                <div className="border border-amber-500/20 rounded-xl overflow-hidden bg-amber-500/5">
                  <div className="px-4 py-3 border-b border-amber-500/10 flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {currentSummary.needsWhisper} videos using Whisper AI ({currentSummary.totalCredits} credits)
                      </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {whisperVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                          <div className="relative h-10 w-16 rounded overflow-hidden shrink-0 border border-border">
                            <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-foreground truncate font-medium">{video.title}</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {Math.floor(video.duration / 60)}:{Math.floor(video.duration % 60).toString().padStart(2, '0')} • {video.estimatedCredits} credits
                              </p>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => toggleSingleWhisper(video.videoId, false)}
                             className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/20"
                           >
                              Switch to Free
                           </Button>
                        </div>
                      ))}
                  </div>
                </div>
             )}

             {/* Has Captions List */}
             {currentSummary.hasCaptions > 0 && (
                <div className="border border-green-500/20 rounded-xl overflow-hidden bg-green-500/5">
                  <div className="px-4 py-3 border-b border-green-500/10 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {currentSummary.hasCaptions} videos using Free Auto-captions
                      </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {captionVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                           <div className="relative h-10 w-16 rounded overflow-hidden shrink-0 border border-border">
                             <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate font-medium">{video.title}</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {Math.floor(video.duration / 60)}:{Math.floor(video.duration % 60).toString().padStart(2, '0')}
                              </p>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => toggleSingleWhisper(video.videoId, true)}
                             className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-500/20"
                           >
                              Use Whisper AI
                           </Button>
                        </div>
                      ))}
                  </div>
                </div>
             )}

            {/* Unavailable List (Expandable) */}
            {currentSummary.unavailable > 0 && (
                <div className="border border-red-500/20 rounded-xl overflow-hidden bg-red-500/5">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'unavailable' ? null : 'unavailable')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-600 dark:text-red-400">
                            {currentSummary.unavailable} unavailable videos (skipped)
                        </span>
                    </div>
                    {expandedSection === 'unavailable' ? <ChevronUp className="h-4 w-4 text-red-500"/> : <ChevronDown className="h-4 w-4 text-red-500"/>}
                  </button>
                  
                  {expandedSection === 'unavailable' && (
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1 border-t border-red-500/10">
                      {unavailableVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-foreground truncate">{video.title}</p>
                             <p className="text-xs text-red-500 flex items-center gap-1">
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
        <div className="bg-muted/30 rounded-xl p-5 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 w-full md:w-auto">
               <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">Your Balance:</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background rounded-md border border-border">
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span className={hasEnoughCredits ? "text-green-600 dark:text-green-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                          {userCredits ?? 0}
                      </span>
                  </div>
               </div>
               {hasEnoughCredits ? (
                   <p className="text-xs text-muted-foreground">
                       After extraction: <span className="text-foreground font-medium">{remainingCredits} credits</span>
                   </p>
               ) : (
                   <p className="text-xs text-red-500 font-medium">Insufficient credits</p>
               )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {containsDuplicates && hasEnoughCredits ? (
                   <>
                     <div className="flex flex-col gap-2">
                       <span className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center sm:text-right">What to do with the existing transcript?</span>
                       <div className="flex gap-2">
                         <div className="flex items-center border border-border rounded-md overflow-hidden bg-background">
                            <button
                               onClick={() => setDuplicateAction('replace')}
                               className={`px-3 py-1.5 text-xs font-medium transition-colors ${duplicateAction === 'replace' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
                            >
                               Replace text only
                            </button>
                            <button
                               onClick={() => setDuplicateAction('reset')}
                               className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${duplicateAction === 'reset' ? 'bg-destructive text-destructive-foreground' : 'text-foreground hover:bg-muted'}`}
                            >
                               Full reset
                            </button>
                         </div>
                         <Button 
                             onClick={() => onProceed(localResults, duplicateAction)} 
                             className="shadow-lg shrink-0"
                         >
                             {currentSummary.totalCredits > 0
                                ? `Extract — ${currentSummary.totalCredits} credits for Whisper videos`
                                : 'Extract Selected'}
                         </Button>
                       </div>
                     </div>
                   </>
                ) : (
                    <>
                      <Button variant="outline" onClick={onCancel} className="flex-1 md:flex-none">
                          Cancel
                      </Button>
                      <Button 
                          onClick={() => onProceed(localResults)} 
                          disabled={!hasEnoughCredits && currentSummary.totalCredits > 0} 
                          className="flex-1 md:flex-none px-8 shadow-lg shadow-primary/20"
                      >
                          {currentSummary.totalCredits > 0
                            ? `Extract — ${currentSummary.totalCredits} credits for Whisper videos`
                            : 'Extract Selected'}
                      </Button>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
