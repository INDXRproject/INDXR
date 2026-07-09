"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, Search, XCircle, Clock, ListMusic, Mic, ExternalLink, Info, RefreshCw } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import Image from "next/image";
import { validateYouTubeUrl } from "../utils/youtube";
import { PlaylistAvailabilitySummary } from "./PlaylistAvailabilitySummary";
import { BackgroundJobNotice } from "./BackgroundJobNotice";
import { useAuth } from "../hooks/useAuth";
import { createClient } from "../utils/supabase/client";
import { cn } from "../lib/utils";
import { appHref } from "../lib/cross-host-links";
import { CompletionReceipt } from "./ui/CompletionReceipt";
import type { ReceiptData } from "../hooks/useCompletionReceipt";

interface PlaylistEntry {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  has_captions?: boolean;
}


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

export type VideoStatus = 'pending' | 'extracting' | 'success' | 'error' | 'unavailable' | 'no_speech' | 'youtube_restricted' | 'age_restricted' | 'bot_detection' | 'timeout' | 'members_only' | 'no_captions'

interface PlaylistManagerProps {
  onExtract: (videoIds: string[], availabilityData?: VideoAvailability[], playlistTitle?: string, playlistUrl?: string) => void;
  isExtracting: boolean;
  videoStatuses?: Record<string, VideoStatus>;
  freeVideoIds?: Set<string>;
  whisperVideoIds?: Set<string>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onError: (message: string | null) => void;
  onSwitchToAudio?: () => void;
  onRetryVideo?: (videoId: string) => void;
  onRetryAll?: (videoIds: string[]) => void;
  elapsedSeconds?: number;
  resumePlaylist?: { title: string; entries: PlaylistEntry[] } | null;
  receipt?: ReceiptData;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistManager({ onExtract, isExtracting, videoStatuses = {}, freeVideoIds, whisperVideoIds, isAuthenticated, onAuthRequired, onError, onSwitchToAudio, onRetryVideo, onRetryAll, elapsedSeconds = 0, resumePlaylist, receipt }: PlaylistManagerProps) {
  const { credits, refreshCredits } = useAuth()
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<{ title: string; entries: PlaylistEntry[]; total_count?: number; unavailable_count?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [visibleCount, setVisibleCount] = useState(25);
  
  // Availability check state
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityResults, setAvailabilityResults] = useState<VideoAvailability[] | null>(null)
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary | null>(null)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [finalElapsed, setFinalElapsed] = useState(0)
  const [hasExtracted, setHasExtracted] = useState(false);
  const [existingDuplicates, setExistingDuplicates] = useState<Record<string, Array<{ transcriptId: string; processingMethod: string }>>>({}); // video_id -> [{ transcriptId, processingMethod }]
  const [inlineError, setInlineError] = useState<string | null>(null);
  const supabase = createClient();

  // Monitor extraction progress
  useEffect(() => {
    if (!isExtracting && Object.keys(videoStatuses).length > 0) {
      // Check if all are done (success or any failure type)
      const allDone = Object.values(videoStatuses).every(s =>
        s === 'success' || s === 'error' || s === 'unavailable' || s === 'no_speech' ||
        s === 'youtube_restricted' || s === 'age_restricted' || s === 'bot_detection' ||
        s === 'timeout' || s === 'members_only' || s === 'no_captions'
      )
      if (allDone) {
         setIsCompleted(true)
         // Keep the original run's total time. A retry restarts the parent's
         // elapsedSeconds from 0, so overwriting here would show the retry's short
         // duration instead of the whole-playlist time. handleReset clears this for
         // a genuinely new extraction (the only path back to the form).
         setFinalElapsed(prev => prev > 0 ? prev : elapsedSeconds)
         refreshCredits()
      }
    } else if (isExtracting) {
      setIsCompleted(false)
    }
  }, [isExtracting, videoStatuses, refreshCredits, elapsedSeconds])

  // Resume hydration: when returning to an in-progress job, the parent supplies
  // the persisted entry list (titles/thumbnails). Rebuild the playlist card so the
  // per-video list reappears; the per-video statuses come in via `videoStatuses`
  // (hydrated from the DB job row). Only seeds when the list isn't already built.
  useEffect(() => {
    if (resumePlaylist && resumePlaylist.entries.length > 0) {
      setPlaylist(prev => prev ?? { title: resumePlaylist.title, entries: resumePlaylist.entries })
      setHasExtracted(true)
    }
  }, [resumePlaylist])

  const handleReset = () => {
    setHasExtracted(false);
    setIsCompleted(false);
    setFinalElapsed(0);
    setAvailabilityResults(null);
    setAvailabilitySummary(null);
    setShowAvailabilityModal(false);
    setPlaylist(null);
    setUrl("");
    setLoading(false);
    setSelectedIds(new Set());
  }



  const fetchPlaylistInfo = async () => {
    if (hasExtracted) return;
    if (!url) return;

    // Validate Input
    const validation = validateYouTubeUrl(url, 'playlist');
    if (validation.type !== 'VALID_PLAYLIST') {
      let message = "Please enter a valid YouTube Playlist URL";
      if (validation.type === 'NON_YOUTUBE') message = "Please enter a valid YouTube URL";
      if (validation.type === 'MALFORMED') message = "This doesn't look like a valid YouTube link. Please check and try again.";
      onError(message);
      return;
    }
    
    setLoading(true);
    setPlaylist(null);
    setSelectedIds(new Set());
    setVisibleCount(25);
    // Bug 2 fix: Reset availability breakdown so old results don't persist
    setAvailabilityResults(null);
    setAvailabilitySummary(null);
    setShowAvailabilityModal(false);
    onError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch("/api/playlist/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to fetch playlist");

      setPlaylist(data);
      
      // Fetch duplicates in background or await here so we can uncheck them
      const videoIds = data.entries.map((e: PlaylistEntry) => e.id);
      
      // We safely fetch the first 1000 items (unlikely to have a 1000+ playlist here)
      const { data: { user } } = await supabase.auth.getUser()
      const dupes: Record<string, Array<{ transcriptId: string; processingMethod: string }>> = {}
      if (user && videoIds.length > 0) {
        // Query Supabase
        const { data: existing } = await supabase
          .from('transcripts')
          .select('id, video_id, processing_method')
          .eq('user_id', user.id)
          .in('video_id', videoIds)

        if (existing) {
          existing.forEach(t => {
            if (!dupes[t.video_id]) dupes[t.video_id] = []
            dupes[t.video_id].push({ transcriptId: t.id, processingMethod: t.processing_method || 'youtube_captions' })
          })
        }
      }
      setExistingDuplicates(dupes);

      // Select first 10 by default, filtering out private videos AND captions duplicates
      const validEntries = data.entries.slice(0, 10).filter((e: PlaylistEntry) =>
        e.title !== "[Private video]" && e.title !== "[Private Video]" && e.title !== "Private video" &&
        !dupes[e.id]?.some(d => d.processingMethod === 'youtube_captions')
      );
      const initialSelected = new Set<string>(validEntries.map((e: PlaylistEntry) => e.id));
      setSelectedIds(initialSelected);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch playlist";
      setInlineError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    if (hasExtracted) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (!playlist || hasExtracted) return;
    const validEntries = playlist.entries.filter(e => 
      e.title !== "[Private video]" && e.title !== "[Private Video]" && e.title !== "Private video"
    );
    setSelectedIds(new Set(validEntries.map(e => e.id)));
  };

  const deselectAll = () => {
    if (hasExtracted) return;
    setSelectedIds(new Set());
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 25);
  };



  const handleCheckAvailability = async () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (selectedIds.size === 0) {
      setInlineError("Please select at least one video");
      return;
    }

    setIsCheckingAvailability(true);
    onError(null);

    try {
      // Local Instant Processing
      const results: VideoAvailability[] = [];
      let total = 0;
      let hasCaptions = 0;

      for (const id of selectedIds) {
        const entry = playlist?.entries.find(e => e.id === id);
        if (!entry) continue;

        total++;
        const duration = entry.duration || 0;
        
        // Logical constants for availability check
        hasCaptions++;
        
        results.push({
          videoId: entry.id,
          title: entry.title,
          duration: duration,
          thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.id}/mqdefault.jpg`,
          status: 'has_captions', // Force Free Attempt
          estimatedCredits: 0, // Show 0 cost
        });
      }
      
      const summary: AvailabilitySummary = {
          total,
          hasCaptions,
          needsWhisper: 0,
          unavailable: 0,
          totalCredits: 0
      };

      // Simulate a tiny delay for UX so it doesn't feel glitchy
      await new Promise(resolve => setTimeout(resolve, 300));

      setAvailabilityResults(results);
      setAvailabilitySummary(summary);
      setShowAvailabilityModal(true);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to check availability";
      setInlineError(message);
      onError(message);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleProceedWithExtraction = (finalResults: VideoAvailability[], duplicateAction?: 'replace' | 'reset') => {
    // Prevent double extraction
    if (hasExtracted) return;

    // Filter to only extract available videos (has_captions or needs_whisper)
    if (finalResults) {
      const extractableIds = finalResults
        .filter(r => r.status === 'has_captions' || r.status === 'needs_whisper')
        .map(r => r.videoId);

      // Inject method-aware duplicate logic into the results that go back up
      const enhancedResults = finalResults.map(r => {
        const existingEntries = existingDuplicates[r.videoId] || [];
        const effectiveMethod = r.status === 'needs_whisper' ? 'whisper_ai' : 'youtube_captions';
        const matchingEntry = existingEntries.find(e => e.processingMethod === effectiveMethod);
        return {
          ...r,
          duplicateId: matchingEntry?.transcriptId,
          duplicateAction: matchingEntry ? duplicateAction : undefined,
        };
      });

      setHasExtracted(true);
      setShowAvailabilityModal(false); // Hide inline summary
      onExtract(extractableIds, enhancedResults, playlist?.title, url);
    }
  };

  const availableCount = playlist?.entries?.length || 0;
  // Real count from the backend: playlist items that could not be resolved to a
  // playable video (private/members-only/deleted). Not a cap-driven subtraction.
  const missingCount = playlist?.unavailable_count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-xl mx-auto">
        <div className="relative flex-1">
          <Input
            placeholder="Paste YouTube Playlist URL..."
            className="h-12 bg-bg border-border text-fg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPlaylistInfo()}
          />
        </div>
        <Button
          size="lg"
          className="h-12 px-6"
          onClick={fetchPlaylistInfo}
          disabled={loading || !url}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Fetching..." : "Fetch Playlist"}
        </Button>
      </div>
      <p className="text-xs text-fg-muted text-center -mt-4">
        Auto-captions are free for the first 3 videos. From video 4: 1 credit per video (with auto-captions). Videos using AI Transcription cost 1 credit per minute instead — no per-video charge.
      </p>

      {inlineError && (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{inlineError}</span>
          <button onClick={() => setInlineError(null)} className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* Progress / Completion Bar */}
      {(isExtracting || isCompleted) && (
        <div className={`bg-surface-sunken border ${isCompleted ? 'border-success/20 bg-success-subtle' : 'border-border'} rounded-xl p-6 animate-in fade-in slide-in-from-top-2 transition-all`}>
            {isCompleted ? (
                // Final Summary View
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success-subtle rounded-full text-success">
                             <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-fg">Extraction Complete!</h3>
                             <p className="text-fg-muted text-sm">
                                 {(() => {
                                   const succeeded = Object.values(videoStatuses).filter(s => s === 'success').length;
                                   const total = Object.keys(videoStatuses).length;
                                   const failed = Object.values(videoStatuses).filter(s => s !== 'success' && s !== 'pending' && s !== 'extracting' && s !== 'unavailable').length;
                                   const time = finalElapsed > 0 ? ` in ${formatElapsed(finalElapsed)}` : '';
                                   if (failed === 0) {
                                     return `All ${total} video${total !== 1 ? 's' : ''} extracted successfully${time}. Your transcripts are ready in the library.`;
                                   }
                                   return `Extracted ${succeeded} of ${total} video${total !== 1 ? 's' : ''}${time}. ${failed} video${failed !== 1 ? 's' : ''} couldn't be processed.`;
                                 })()}
                             </p>
                        </div>
                    </div>

                    {/* Credit receipt (ADR-050 fase 3) — total charged + per-video breakdown; refund transparency when videos were skipped */}
                    {receipt && receipt.used != null && (
                      <div className="border-t border-border-subtle pt-3 -mt-1">
                        <CompletionReceipt
                          kind="playlist"
                          status="complete"
                          headline="Playlist extracted"
                          used={receipt.used}
                          reserved={receipt.reserved}
                          refunded={receipt.refunded}
                          transcribedCount={receipt.transcribedCount}
                          skippedCount={receipt.skippedCount}
                          videos={receipt.videos}
                          elapsedSeconds={finalElapsed}
                          libraryHref={appHref('/dashboard/library')}
                          embedded
                        />
                      </div>
                    )}

                    {/* Grouped failure summary */}
                    {(() => {
                      const vals = Object.values(videoStatuses);
                      const botOrTimeout = vals.filter(s => s === 'bot_detection' || s === 'timeout').length;
                      const ageRestricted = vals.filter(s => s === 'age_restricted').length;
                      const membersOnly = vals.filter(s => s === 'members_only').length;
                      const youtubeRestricted = vals.filter(s => s === 'youtube_restricted').length;
                      const extractionError = vals.filter(s => s === 'error').length;
                      const groups: string[] = [
                        ...(botOrTimeout > 0 ? [`⚠️ ${botOrTimeout} video${botOrTimeout !== 1 ? 's' : ''} couldn't be fetched — YouTube's rate limit or a temporary connection issue — and failed after an automatic retry. Retry ${botOrTimeout !== 1 ? 'them' : 'it'} below with a fresh connection, or use Audio Upload.`] : []),
                        ...(ageRestricted > 0 ? [`🔞 ${ageRestricted} video${ageRestricted !== 1 ? 's' : ''} ${ageRestricted !== 1 ? 'are' : 'is'} age-restricted. YouTube prevents transcription of these videos. Download the audio manually and use Audio Upload instead.`] : []),
                        ...(membersOnly > 0 ? [`🔒 ${membersOnly} video${membersOnly !== 1 ? 's' : ''} ${membersOnly !== 1 ? 'are' : 'is'} members-only. You need a channel membership to access these videos.`] : []),
                        ...(youtubeRestricted > 0 ? [`🚫 ${youtubeRestricted} video${youtubeRestricted !== 1 ? 's' : ''} ${youtubeRestricted !== 1 ? 'are' : 'is'} unavailable or restricted on YouTube.`] : []),
                        ...(extractionError > 0 ? [`❌ ${extractionError} video${extractionError !== 1 ? 's' : ''} failed with an unexpected error and couldn't be transcribed. This is uncommon — try Audio Upload, or contact support if it keeps happening.`] : []),
                      ];
                      if (groups.length === 0) return null;
                      return (
                        <div className="flex flex-col gap-1.5 p-3 bg-surface-elevated/50 border border-border rounded-lg">
                          {groups.map((msg, i) => (
                            <p key={i} className="text-sm text-fg-muted leading-snug">{msg}</p>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Stats row: free + failed breakdown */}
                    {(() => {
                      const freeCount = freeVideoIds?.size ?? 0
                      const noCaptionsIds = Object.entries(videoStatuses).filter(([, s]) => s === 'no_captions').map(([id]) => id)
                      const noSpeechIds = Object.entries(videoStatuses).filter(([, s]) => s === 'no_speech').map(([id]) => id)
                      const failedVideoIds = [...noCaptionsIds, ...noSpeechIds]
                      const failedEntries = playlist?.entries.filter(e => failedVideoIds.includes(e.id)) ?? []
                      if (freeCount === 0 && failedEntries.length === 0) return null
                      return (
                        <div className="space-y-3">
                          {/* Credit / free summary */}
                          {freeCount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-fg-muted">
                              <span className="text-[10px] uppercase font-bold text-success bg-success-subtle px-1.5 py-0.5 rounded">{freeCount} free</span>
                              <span>{freeCount} video{freeCount !== 1 ? 's' : ''} extracted without using credits</span>
                            </div>
                          )}
                          {/* Failed videos needing audio upload */}
                          {failedEntries.length > 0 && (
                            <div className="p-3 bg-surface-elevated/50 border border-border rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                                {failedEntries.length} video{failedEntries.length !== 1 ? 's' : ''} need audio upload
                              </p>
                              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                                {failedEntries.map(e => (
                                  <div key={e.id} className="flex items-center gap-2">
                                    {e.thumbnail && (
                                      <Image
                                        src={e.thumbnail}
                                        alt=""
                                        width={40}
                                        height={22}
                                        className="rounded shrink-0 object-cover"
                                        unoptimized
                                      />
                                    )}
                                    <span className="text-xs text-fg-muted truncate">{e.title}</span>
                                    <span className="shrink-0 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                      {videoStatuses[e.id] === 'no_speech' ? 'No speech' : 'No captions'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="w-full mt-1 h-7 text-xs opacity-50 cursor-not-allowed"
                                title="Coming soon"
                              >
                                Save failed videos for later
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Rate-limited videos — retry each without re-running the whole playlist */}
                    {(() => {
                      const retryableIds = Object.entries(videoStatuses)
                        .filter(([, s]) => s === 'bot_detection' || s === 'timeout')
                        .map(([id]) => id)
                      const retryableEntries = playlist?.entries.filter(e => retryableIds.includes(e.id)) ?? []
                      if (retryableEntries.length === 0 || !onRetryVideo) return null
                      return (
                        <div className="p-3 bg-surface-elevated/50 border border-border rounded-lg space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                              {retryableEntries.length} video{retryableEntries.length !== 1 ? 's' : ''} to retry
                            </p>
                            {onRetryAll && retryableIds.length > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isExtracting}
                                className="h-7 text-xs shrink-0"
                                onClick={() => onRetryAll(retryableIds)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry all {retryableIds.length}
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            {retryableEntries.map(e => (
                              <div key={e.id} className="flex items-center gap-2">
                                {e.thumbnail && (
                                  <Image src={e.thumbnail} alt="" width={40} height={22} className="rounded shrink-0 object-cover" unoptimized />
                                )}
                                <span className="text-xs text-fg-muted truncate flex-1">{e.title}</span>
                                <span className="shrink-0 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  {videoStatuses[e.id] === 'timeout' ? 'Timeout' : 'Blocked'}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isExtracting || videoStatuses[e.id] === 'extracting'}
                                  className="h-7 text-xs shrink-0"
                                  onClick={() => onRetryVideo(e.id)}
                                >
                                  {videoStatuses[e.id] === 'extracting'
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <><RefreshCw className="h-3 w-3 mr-1" /> Retry</>}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex items-center gap-3 mt-2">
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            className="bg-bg border-border hover:bg-surface-elevated text-fg"
                        >
                            Start New Extraction
                        </Button>
                        <Button
                            className="bg-accent hover:bg-accent/90 text-fg-on-accent"
                            onClick={() => window.location.href = appHref('/dashboard/library')}
                        >
                            View in Library
                        </Button>
                    </div>
                </div>
            ) : (
                // In Progress View
                <>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium flex items-center gap-2 text-fg">
                            <Loader2 className="h-4 w-4 animate-spin text-accent" />
                            Extracting Playlist...
                        </span>
                        <span className="text-xs text-fg-muted">
                            {Object.values(videoStatuses).filter(s => s === 'success').length} / {Object.keys(videoStatuses).length} completed · {formatElapsed(elapsedSeconds)}
                        </span>
                    </div>
                    <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-500 ease-out"
                            style={{ width: `${(Object.values(videoStatuses).filter(s => s === 'success' || s === 'error' || s === 'unavailable' || s === 'no_speech' || s === 'youtube_restricted' || s === 'age_restricted' || s === 'bot_detection' || s === 'timeout' || s === 'members_only' || s === 'no_captions').length / Math.max(1, Object.keys(videoStatuses).length)) * 100}%` }}
                        />
                    </div>
                    <BackgroundJobNotice
                        largePlaylist={Object.keys(videoStatuses).length > 50}
                        className="mt-4"
                    />
                </>
            )}
        </div>
      )}

      {/* Availability Summary INLINE */}
      {showAvailabilityModal && availabilityResults && availabilitySummary && (
        <PlaylistAvailabilitySummary
          results={availabilityResults}
          summary={availabilitySummary}
          userCredits={credits}
          existingDuplicates={existingDuplicates} // <--- Added this line
          onProceed={handleProceedWithExtraction}
          onCancel={() => {
             setShowAvailabilityModal(false);
             setAvailabilityResults(null);
             setAvailabilitySummary(null);
          }}
        />
      )}

      {playlist && !showAvailabilityModal && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-border bg-surface-elevated/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <ListMusic className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-fg truncate max-w-[300px] md:max-w-md">
                  {playlist.title}
                </h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-fg-muted">
                    {selectedIds.size} of {availableCount} available videos selected
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={selectAll}
                      className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-fg-subtle">|</span>
                    <button 
                      onClick={deselectAll}
                      className="text-xs text-fg-muted hover:text-fg font-medium transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            {!hasExtracted && (
              <div className="flex gap-2">
                  <Button
                    onClick={handleCheckAvailability}
                    disabled={isCheckingAvailability || selectedIds.size === 0}
                    className="px-6 shadow-lg shadow-primary/20"
                  >
                    {isCheckingAvailability ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Check Availability
                      </>
                    )}
                  </Button>
              </div>
            )}
          </div>

          {missingCount > 0 && (
            <div className="px-6 py-2 bg-amber-500/10 border-b border-border flex items-center gap-2 text-warning-fg dark:text-amber-500 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{missingCount} videos unavailable (private, members-only, or deleted). Showing {availableCount} available videos.</span>
            </div>
          )}

          <ScrollArea className="h-[400px]">
            <div className="p-4 grid gap-2">
              {playlist?.entries?.slice(0, visibleCount).map((entry, idx) => {
                  const isPrivate = entry.title === "[Private video]" || entry.title === "[Private Video]" || entry.title === "Private video";
                  
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all border",
                        isPrivate 
                          ? "opacity-50 cursor-not-allowed border-transparent bg-surface-elevated/20" 
                          : selectedIds.has(entry.id)
                            ? "bg-accent/5 border-primary/20 ring-1 ring-primary/20 cursor-pointer"
                            : "bg-transparent border-transparent hover:bg-surface-elevated/50 cursor-pointer"
                      )}
                      onClick={() => !isPrivate && toggleSelection(entry.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => !isPrivate && toggleSelection(entry.id)}
                        disabled={isPrivate}
                        className="border-border"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm text-fg truncate font-medium">
                            {entry.title}
                          </span>
                          {!hasExtracted && idx < 3 && !isPrivate && (
                            <span className="text-[10px] uppercase font-bold text-success bg-success-subtle px-1.5 py-0.5 rounded shrink-0">Free</span>
                          )}
                          {videoStatuses[entry.id] === 'success' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                          {videoStatuses[entry.id] === 'error' && <XCircle className="h-4 w-4 text-error shrink-0" />}
                          {videoStatuses[entry.id] === 'unavailable' && <XCircle className="h-4 w-4 text-fg-muted shrink-0" />}
                          {(videoStatuses[entry.id] === 'youtube_restricted' || videoStatuses[entry.id] === 'bot_detection' || videoStatuses[entry.id] === 'timeout') && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                          {(videoStatuses[entry.id] === 'age_restricted' || videoStatuses[entry.id] === 'members_only') && <XCircle className="h-4 w-4 text-error-fg shrink-0" />}
                          {videoStatuses[entry.id] === 'extracting' && (
                            whisperVideoIds?.has(entry.id) ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-accent shrink-0">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                                </span>
                                Transcribing with AI
                              </span>
                            ) : (
                              <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />
                            )
                          )}
                        </div>
                        {entry.duration && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-fg-muted font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(entry.duration / 60)}:{Math.floor(entry.duration % 60).toString().padStart(2, '0')}
                            </span>
                            {videoStatuses[entry.id] === 'extracting' && whisperVideoIds?.has(entry.id) && elapsedSeconds > 0 && (
                              <span className="text-[10px] font-mono text-accent/80">{formatElapsed(elapsedSeconds)}</span>
                            )}
                            {freeVideoIds?.has(entry.id) && <span className="text-[10px] uppercase font-bold text-success bg-success-subtle px-1.5 py-0.5 rounded">Free</span>}
                            {videoStatuses[entry.id] === 'unavailable' && <span className="text-[10px] uppercase font-bold text-fg-muted bg-surface-elevated px-1.5 py-0.5 rounded">Unavailable</span>}
                            {videoStatuses[entry.id] === 'error' && <span className="text-[10px] uppercase font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">Failed</span>}
                            {videoStatuses[entry.id] === 'no_speech' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">No speech detected</span>}
                            {videoStatuses[entry.id] === 'youtube_restricted' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Unavailable</span>}
                            {videoStatuses[entry.id] === 'bot_detection' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Temporarily blocked</span>}
                            {videoStatuses[entry.id] === 'timeout' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Connection timeout</span>}
                            {videoStatuses[entry.id] === 'age_restricted' && <span className="text-[10px] uppercase font-bold text-error-fg bg-error-subtle px-1.5 py-0.5 rounded">Age-restricted</span>}
                            {videoStatuses[entry.id] === 'members_only' && <span className="text-[10px] uppercase font-bold text-error-fg bg-error-subtle px-1.5 py-0.5 rounded">Members only</span>}
                            {videoStatuses[entry.id] === 'no_captions' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">No captions</span>}

                             {/* Duplicate Badges */}
                             {!hasExtracted && existingDuplicates[entry.id] && (() => {
                               const entries = existingDuplicates[entry.id];
                               const captionsEntry = entries.find(e => e.processingMethod === 'youtube_captions');
                               const whisperEntry = entries.find(e => e.processingMethod === 'whisper_ai' || e.processingMethod === 'assemblyai');
                               return (
                                 <>
                                   {captionsEntry && (
                                     <a
                                       href={appHref(`/dashboard/library/${captionsEntry.transcriptId}`)}
                                       target="_blank"
                                       onClick={(e) => e.stopPropagation()}
                                       className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-amber-500/20 transition-colors"
                                       title="View existing captions transcript"
                                     >
                                       Captions in library <ExternalLink className="h-2.5 w-2.5" />
                                     </a>
                                   )}
                                   {whisperEntry && (
                                     <a
                                       href={appHref(`/dashboard/library/${whisperEntry.transcriptId}`)}
                                       target="_blank"
                                       onClick={(e) => e.stopPropagation()}
                                       className="text-[10px] uppercase font-bold text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-violet-500/20 transition-colors"
                                       title="View existing AI transcript"
                                     >
                                       AI transcript in library <ExternalLink className="h-2.5 w-2.5" />
                                     </a>
                                   )}
                                 </>
                               );
                             })()}
                             
                             {/* Show Whisper Needed badge if checked */}
                             {availabilityResults?.find(r => r.videoId === entry.id)?.status === 'needs_whisper' && (
                               <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                 <AlertCircle className="h-3 w-3" /> AI
                               </span>
                             )}
                          </div>
                        )}

                        {/* YouTube Restricted Expanded Message */}
                        {videoStatuses[entry.id] === 'youtube_restricted' && (
                          <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-warning-fg dark:text-amber-500 mb-2">
                              This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload via our Audio Upload tab.
                            </p>
                            {onSwitchToAudio && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSwitchToAudio();
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-warning-fg dark:text-amber-500 hover:text-amber-700 dark:hover:text-warning transition-colors"
                              >
                                <Mic className="h-3 w-3" />
                                Try Audio Upload →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
              })}
              
              {availableCount > visibleCount && (
                <>
                  <p className="text-center text-xs text-fg-muted mt-1">
                    Showing {Math.min(visibleCount, availableCount)} of {availableCount}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full mt-2 h-12 text-fg-muted hover:text-fg hover:bg-surface-elevated/50 border border-border border-dashed"
                    onClick={loadMore}
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More ({availableCount - visibleCount} more)
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
          {!hasExtracted && (
            <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 text-xs text-fg-muted">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>The first 3 videos are always free. Credits apply from video 4 onwards.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
