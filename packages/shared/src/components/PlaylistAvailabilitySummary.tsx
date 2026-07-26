import { ChevronDown, ChevronUp, Info, XCircle } from "lucide-react";
import Image from "next/image";
import { appHref } from "../lib/cross-host-links";
import { useState } from "react";
import { Button } from "./ui/button";
import { CostBreakdown, BalanceLine } from "./transcribe/CostBreakdown";
import { MethodBadge } from "./transcribe/MethodBadge";
import { Switch } from "./ui/switch";

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
  // Real count of videos YouTube did not return from the playlist fetch — private or deleted.
  // (Members-only videos DO come through here and only fail later, at extraction — live-verified,
  // so they are NOT counted as unavailable.) These were already excluded; shown here for context.
  unavailableCount: number
  existingDuplicates: Record<string, Array<{ transcriptId: string; processingMethod: string }>>
  onProceed: (results: VideoAvailability[], duplicateAction?: 'replace' | 'reset') => void
  onCancel: () => void
}

export function PlaylistAvailabilitySummary({ results, userCredits, unavailableCount, existingDuplicates, onProceed, onCancel }: PlaylistAvailabilitySummaryProps) {
  const [expandedSection, setExpandedSection] = useState<'captions' | 'unavailable' | null>('unavailable')

  const isDuplicateForStatus = (videoId: string, status: string): boolean => {
    const entries = existingDuplicates[videoId] || [];
    if (status === 'has_captions') return entries.some(e => e.processingMethod === 'youtube_captions');
    if (status === 'needs_whisper') return entries.some(e => e.processingMethod === 'whisper_ai' || e.processingMethod === 'assemblyai');
    return false;
  };

  // Track local results for Whisper toggling
  const [localResults, setLocalResults] = useState<VideoAvailability[]>(() => {
    return results.map(r => ({
      ...r,
      isDuplicate: isDuplicateForStatus(r.videoId, r.status)
    }))
  })

  // Duplicate Action selection
  const containsDuplicates = localResults.some(r => r.isDuplicate && r.status !== 'unavailable')
  const [duplicateAction, setDuplicateAction] = useState<'replace' | 'reset'>('replace')

  // Live recalculate summary
  const extractableResults = localResults.filter(r => r.status !== 'unavailable')
  const extractableIndex = new Map(extractableResults.map((r, idx) => [r.videoId, idx]))

  // captions idx 0–2 are free; captions idx >= 3 cost 1 credit each; whisper costs per-minute at any idx
  const captionCredits = extractableResults.filter((r, idx) => r.status === 'has_captions' && idx >= 3).length
  const whisperCredits = extractableResults.filter(r => r.status === 'needs_whisper').reduce((acc, r) => acc + r.estimatedCredits, 0)
  const totalExtractionCredits = captionCredits + whisperCredits

  const currentSummary = {
    total: localResults.length,
    hasCaptions: localResults.filter(r => r.status === 'has_captions').length,
    needsWhisper: localResults.filter(r => r.status === 'needs_whisper').length,
    unavailable: localResults.filter(r => r.status === 'unavailable').length,
    totalCredits: whisperCredits
  }

  const hasEnoughCredits = userCredits === null || userCredits >= totalExtractionCredits

  const unavailableVideos = localResults.filter(r => r.status === 'unavailable')

  // Only captions at idx 0–2 are free; whisper at any idx always costs credits (matches backend logic)
  const freeVideoIds = new Set(
    extractableResults.slice(0, 3).filter(r => r.status === 'has_captions').map(r => r.videoId)
  )

  const toggleAllWhisper = (useWhisper: boolean) => {
    setLocalResults(prev => prev.map(r => {
      if (r.status === 'unavailable') return r
      const newStatus = useWhisper ? 'needs_whisper' as const : 'has_captions' as const
      return {
        ...r,
        status: newStatus,
        estimatedCredits: useWhisper ? Math.max(1, Math.ceil(r.duration / 60)) : 0,
        isDuplicate: isDuplicateForStatus(r.videoId, newStatus),
      }
    }))
  }

  const toggleSingleWhisper = (videoId: string, useWhisper: boolean) => {
    setLocalResults(prev => prev.map(r => {
      if (r.videoId !== videoId) return r
      const newStatus = useWhisper ? 'needs_whisper' as const : 'has_captions' as const
      return {
        ...r,
        status: newStatus,
        estimatedCredits: useWhisper ? Math.max(1, Math.ceil(r.duration / 60)) : 0,
        isDuplicate: isDuplicateForStatus(r.videoId, newStatus),
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
    <div className="bg-surface border border-border rounded-xl animate-in fade-in slide-in-from-top-4 duration-500 my-6 shadow-lg">
      <div className="p-6 border-b border-border bg-surface-elevated/30 rounded-t-xl flex flex-wrap justify-between items-center gap-3">
        <div className="min-w-0">
           <h3 className="text-lg font-semibold text-fg mb-1">Before you start</h3>
           <p className="text-sm text-fg-muted">Choose how each video is transcribed, and see what it costs.</p>
        </div>

        {/* Global method switch — a real switch with a visible on/off track (ADR-080), flips
            every video to AI or back to free captions. On = all AI. */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-xs font-medium text-fg-subtle">AI for all</span>
          <Switch
            checked={currentSummary.hasCaptions === 0}
            onCheckedChange={(on) => toggleAllWhisper(on)}
            aria-label="Use AI transcription for all videos"
          />
        </label>
      </div>

      <div className="p-6 space-y-6">
        {/* Cost breakdown (B1, ADR-080) — one bar in method colours replaces the three statcards.
            Zero-count segments do not render; unavailable shows in red only when there are any. */}
        <CostBreakdown
          segments={[
            {
              key: "cap",
              tone: "captions",
              count: currentSummary.hasCaptions,
              label: `${currentSummary.hasCaptions} auto-captions`,
              amount: captionCredits > 0 ? `${captionCredits} credit${captionCredits !== 1 ? "s" : ""}` : "free",
            },
            {
              key: "ai",
              tone: "ai",
              count: currentSummary.needsWhisper,
              label: `${currentSummary.needsWhisper} AI transcription`,
              amount: `${whisperCredits} credit${whisperCredits !== 1 ? "s" : ""}`,
            },
            {
              key: "un",
              tone: "unavailable",
              count: unavailableCount,
              label: `${unavailableCount} unavailable`,
              amount: "not included",
              refund: true,
            },
          ]}
          totalAmount={totalExtractionCredits > 0 ? `${totalExtractionCredits} credit${totalExtractionCredits !== 1 ? "s" : ""}` : "Free"}
        />

        <div className="flex items-start gap-2 text-xs text-fg-muted bg-surface-elevated/30 border border-border rounded-lg px-3 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Nothing is checked in advance. If a video turns out to have no captions, or is private or
            members-only, it&apos;s skipped during extraction with a note — and any credits held for it
            are returned to your balance.
          </span>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
             {/* Per-video rows — method colour + a tappable (44px) toggle chip (ADR-080). The
                 method badge carries the per-row cost; free auto-captions read as "Auto · free". */}
             {extractableResults.length > 0 && (
               <div className="overflow-hidden rounded-xl border border-border">
                 <div className="max-h-72 divide-y divide-border-subtle overflow-y-auto">
                   {extractableResults.map((video) => {
                     const isAi = video.status === 'needs_whisper'
                     const free = freeVideoIds.has(video.videoId)
                     const paidCaption = !isAi && !free && (extractableIndex.get(video.videoId) ?? 0) >= 3
                     const costLabel = isAi ? `${video.estimatedCredits} cr` : paidCaption ? '1 cr' : 'free'
                     const dur = `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}`
                     // < md: thumbnail + title (2 lines) + duration on top, badge + toggle on a
                     // second row under the title. sm+: single row. The title never collapses to a
                     // few characters (ADR-080 points 1-2).
                     return (
                       <div key={video.videoId} className="flex flex-col gap-2 bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                         <div className="flex min-w-0 items-start gap-3 sm:flex-1">
                           <div className="relative h-[34px] w-14 shrink-0 overflow-hidden rounded border border-border sm:h-[26px] sm:w-11">
                             <Image src={video.thumbnail} alt="" fill className="object-cover" />
                           </div>
                           <div className="min-w-0 flex-1">
                             <p className="line-clamp-2 text-sm text-fg sm:line-clamp-1">{video.title}</p>
                             <p className="font-mono text-xs text-fg-muted">
                               {dur}
                               {video.isDuplicate && <span className="ml-2 font-sans">· in library</span>}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2 pl-[4.25rem] sm:shrink-0 sm:pl-0">
                           <MethodBadge method={isAi ? 'ai' : 'captions'} className="shrink-0">
                             {isAi ? `AI · ${costLabel}` : `Auto · ${costLabel}`}
                           </MethodBadge>
                           <button
                             type="button"
                             onClick={() => toggleSingleWhisper(video.videoId, !isAi)}
                             className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-subtle hover:bg-surface-elevated transition-colors cursor-pointer"
                           >
                             {isAi ? 'Use captions' : 'Use AI'}
                           </button>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               </div>
             )}

            {/* Unavailable List (Expandable) */}
            {currentSummary.unavailable > 0 && (
                <div className="border border-error/20 rounded-xl overflow-hidden bg-error-subtle">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'unavailable' ? null : 'unavailable')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-error-subtle transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-error" />
                        <span className="font-medium text-error-fg dark:text-error-fg">
                            {currentSummary.unavailable} unavailable videos (skipped)
                        </span>
                    </div>
                    {expandedSection === 'unavailable' ? <ChevronUp className="h-4 w-4 text-error"/> : <ChevronDown className="h-4 w-4 text-error"/>}
                  </button>
                  
                  {expandedSection === 'unavailable' && (
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1 border-t border-red-500/10">
                      {unavailableVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated/20">
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-fg truncate">{video.title}</p>
                             <p className="text-xs text-error flex items-center gap-1">
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

         {/* Action bar — balance reads as secondary but readable, never amber; irreversibility
             sits right at the Extract button, before the click. On < md it sticks to the bottom
             of the viewport while the list is in view so the Extract button is always reachable. */}
        <div className="sticky bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.5rem)] z-10 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-lg md:static md:bottom-auto md:bg-surface-elevated/30 md:p-4 md:shadow-none">
            <div className="flex flex-wrap items-center gap-3">
                <BalanceLine have={userCredits} cost={totalExtractionCredits} />
                <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="h-9">Cancel</Button>
                    {hasEnoughCredits ? (
                        <Button size="sm" onClick={() => onProceed(localResults)} className="h-9">
                            {totalExtractionCredits > 0
                              ? `Extract — ${totalExtractionCredits} credit${totalExtractionCredits !== 1 ? 's' : ''}`
                              : 'Extract'}
                        </Button>
                    ) : (
                        <a href={appHref('/dashboard/billing')}>
                            <Button size="sm" className="h-9">Buy credits</Button>
                        </a>
                    )}
                </div>
            </div>
            {containsDuplicates && (
                <p className="text-xs text-fg-muted">
                    {localResults.filter(r => r.isDuplicate && r.status !== 'unavailable').length} video(s) already in your library — existing transcripts will be skipped.
                </p>
            )}
            <p className="text-xs text-fg-muted">Once started, this can&apos;t be cancelled.</p>
        </div>
      </div>
    </div>
  )
}
