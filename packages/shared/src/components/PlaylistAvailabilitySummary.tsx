import { ChevronDown, ChevronUp, Info, XCircle } from "lucide-react";
import Image from "next/image";
import { appHref } from "../lib/cross-host-links";
import { useState } from "react";
import { Button } from "./ui/button";
import { CostBreakdown, BalanceLine } from "./transcribe/CostBreakdown";
import { MethodBadge } from "./transcribe/MethodBadge";
import { Switch } from "./ui/switch";
import { playlistFreeIds } from "../lib/pricing";
import { NOTICE_BAR, NOTICE_BASE, NOTICE_ICON, NOTICE_TITLE, noticeCompact } from "../lib/notice";
import type { CollectionChoice } from "./PlaylistManager";

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
  // "Add to" picker (Gevonden 9-11 A3) — the user's collections, the playlist's own title (the
  // default name for a new collection), and the current choice + setter (owned by PlaylistManager
  // so it survives this component remounting between the picker and availability screens).
  collections: Array<{ id: string; name: string }>
  playlistTitle: string
  collectionChoice: CollectionChoice
  onCollectionChoiceChange: (c: CollectionChoice) => void
  onProceed: (results: VideoAvailability[], duplicateAction?: 'replace' | 'reset') => void
  onCancel: () => void
}

export function PlaylistAvailabilitySummary({ results, userCredits, unavailableCount, existingDuplicates, collections, playlistTitle, collectionChoice, onCollectionChoiceChange, onProceed, onCancel }: PlaylistAvailabilitySummaryProps) {
  const [expandedSection, setExpandedSection] = useState<'captions' | 'unavailable' | null>('unavailable')

  // Dedup on the VIDEO, not just the same method (Task 3 dedup-gap fix, 2026-09-12). Must match the
  // skip logic in PlaylistManager's enhancedResults: caption extraction is a duplicate if ANY transcript
  // (caption OR AI) already exists for the video; AI transcription is a duplicate only if an AI
  // transcript already exists (a caption-only video is an upgrade to AI, so it is NOT a duplicate).
  const isDuplicateForStatus = (videoId: string, status: string): boolean => {
    const entries = existingDuplicates[videoId] || [];
    if (status === 'has_captions') return entries.length > 0;
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
  // A duplicate is never sent to the backend at all (PlaylistTab excludes it from video_ids before
  // POSTing) — it costs 0 credits and must not occupy a free-slot position, or the preview here would
  // show a different number than what Python actually reserves (A3; "bon en reservering blijven exact
  // gelijk aan wat Python reserveert").
  const reservableResults = extractableResults.filter(r => !r.isDuplicate)

  // Free slots are per-method (ADR-081): the first N CAPTION videos by playlist position are free,
  // whisper never takes a slot. Single source: playlistFreeIds (mirrors the backend + the receipt).
  // A caption video is charged (1 credit) iff it falls outside that free set.
  const freeVideoIds = playlistFreeIds(
    reservableResults.map(r => r.videoId),
    reservableResults.filter(r => r.status === 'needs_whisper').map(r => r.videoId),
  )
  const captionCredits = reservableResults.filter(r => r.status === 'has_captions' && !freeVideoIds.has(r.videoId)).length
  const whisperCredits = reservableResults.filter(r => r.status === 'needs_whisper').reduce((acc, r) => acc + r.estimatedCredits, 0)
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
    <div className="bg-bg border-2 border-border-strong animate-in fade-in slide-in-from-top-4 duration-500 my-6">
      <div className="p-6 border-b-2 border-border-strong flex flex-wrap justify-between items-center gap-3">
        <div className="min-w-0">
           <h3 className="text-lg font-bold text-fg-strong mb-1">Before you start</h3>
           <p className="text-sm text-fg">Choose how each video is transcribed, and see what it costs.</p>
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
        {/* "Add to" picker (A3) — defaults to the collection already holding videos from this
            playlist (set by the caller), otherwise a new one named after the playlist. Never
            auto-creates a second collection for a course that's already being tracked. */}
        {collections.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="playlist-collection-choice" className="text-xs font-bold text-fg-strong">Add to</label>
            <select
              id="playlist-collection-choice"
              value={collectionChoice.mode === 'existing' ? collectionChoice.id : 'new'}
              onChange={(e) => {
                const v = e.target.value
                onCollectionChoiceChange(v === 'new' ? { mode: 'new' } : { mode: 'existing', id: v })
              }}
              className="h-9 min-w-0 flex-1 border-2 border-border-strong bg-bg px-2 text-sm text-fg-strong sm:flex-none"
            >
              <option value="new">New collection ({playlistTitle || 'this playlist'})</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cost breakdown (B1, ADR-080) — one bar in method colours replaces the three statcards.
            Zero-count segments do not render; unavailable shows in red only when there are any. */}
        <CostBreakdown
          segments={[
            {
              key: "cap",
              tone: "captions",
              count: currentSummary.hasCaptions,
              label: `${currentSummary.hasCaptions} YouTube captions`,
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

        <div className={`flex items-start gap-2 ${noticeCompact("info")}`}>
          <Info className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${NOTICE_ICON.info}`} />
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
               <div className="overflow-hidden border-2 border-border-strong">
                 <div className="max-h-72 divide-y divide-border-subtle overflow-y-auto">
                   {extractableResults.map((video) => {
                     const isAi = video.status === 'needs_whisper'
                     const free = freeVideoIds.has(video.videoId)
                     // Per-method (ADR-081): a caption video is charged iff it's not in the free set.
                     const paidCaption = !isAi && !free
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
                             className="inline-flex min-h-[44px] shrink-0 items-center border-2 border-border-strong bg-bg px-3 text-xs font-bold text-fg-strong hover:bg-bg-subtle transition-colors cursor-pointer"
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
                <div className={`overflow-hidden ${NOTICE_BASE} ${NOTICE_BAR.error}`}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'unavailable' ? null : 'unavailable')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-subtle transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                        <XCircle className={`h-4 w-4 ${NOTICE_ICON.error}`} />
                        <span className={NOTICE_TITLE}>
                            {currentSummary.unavailable} unavailable videos (skipped)
                        </span>
                    </div>
                    {expandedSection === 'unavailable' ? <ChevronUp className="h-4 w-4 text-fg-strong"/> : <ChevronDown className="h-4 w-4 text-fg-strong"/>}
                  </button>
                  
                  {expandedSection === 'unavailable' && (
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1 border-t-2 border-border-strong">
                      {unavailableVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center gap-3 p-2">
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-fg truncate">{video.title}</p>
                             <p className="text-xs font-medium text-error flex items-center gap-1">
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

         {/* Scroll room so the last content clears the sticky bar (which sticks above the tab bar,
             so its flow position is hidden behind it) — ADR-080 point 2. */}
        <div aria-hidden className="h-[calc(var(--tabbar-h)+4rem)] md:hidden" />
         {/* Action bar — balance reads as secondary but readable, never amber; irreversibility
             sits right at the Extract button, before the click. On < md it sticks to the bottom
             of the viewport while the list is in view so the Extract button is always reachable. */}
        <div className="sticky bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.5rem)] z-10 flex flex-col gap-2 border-2 border-border-strong bg-bg p-4 md:static md:bottom-auto md:bg-bg-subtle md:p-4">
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
                        <a href={appHref('/dashboard/credits')}>
                            <Button size="sm" className="h-9">Buy credits</Button>
                        </a>
                    )}
                </div>
            </div>
            {containsDuplicates && (
                <p className="text-xs text-fg">
                    {localResults.filter(r => r.isDuplicate && r.status !== 'unavailable').length} video(s) already in your library — existing transcripts will be skipped.
                </p>
            )}
            <p className="text-xs font-medium text-fg">Once started, this can&apos;t be cancelled.</p>
        </div>
      </div>
    </div>
  )
}
