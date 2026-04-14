"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ListOrdered, CheckCircle2, AlertCircle, ChevronDown, Search, XCircle, Clock, ListMusic, Mic, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { validateYouTubeUrl } from "@/utils/youtube";
import { PlaylistAvailabilitySummary } from "@/components/PlaylistAvailabilitySummary";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

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

export type VideoStatus = 'pending' | 'extracting' | 'success' | 'error' | 'unavailable' | 'no_speech' | 'youtube_restricted' | 'age_restricted' | 'bot_detection' | 'timeout' | 'members_only'

interface PlaylistManagerProps {
  onExtract: (videoIds: string[], availabilityData?: VideoAvailability[], playlistTitle?: string, playlistUrl?: string) => void;
  isExtracting: boolean;
  videoStatuses?: Record<string, VideoStatus>;
  freeVideoIds?: Set<string>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onError: (message: string | null) => void;
  onSwitchToAudio?: () => void;
  elapsedSeconds?: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistManager({ onExtract, isExtracting, videoStatuses = {}, freeVideoIds, isAuthenticated, onAuthRequired, onError, onSwitchToAudio, elapsedSeconds = 0 }: PlaylistManagerProps) {
  const { credits, refreshCredits } = useAuth()
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<{ title: string; entries: PlaylistEntry[]; total_count?: number } | null>(null);
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
  const supabase = createClient();

  // Monitor extraction progress
  useEffect(() => {
    if (!isExtracting && Object.keys(videoStatuses).length > 0) {
      // Check if all are done (success or any failure type)
      const allDone = Object.values(videoStatuses).every(s =>
        s === 'success' || s === 'error' || s === 'unavailable' || s === 'no_speech' ||
        s === 'youtube_restricted' || s === 'age_restricted' || s === 'bot_detection' ||
        s === 'timeout' || s === 'members_only'
      )
      if (allDone) {
         setIsCompleted(true)
         setFinalElapsed(elapsedSeconds)
         refreshCredits()
      }
    } else if (isExtracting) {
      setIsCompleted(false)
    }
  }, [isExtracting, videoStatuses, refreshCredits, elapsedSeconds])

  const handleReset = () => {
    setHasExtracted(false);
    setIsCompleted(false);
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
      toast.success(`Found ${data.entries.length} videos!`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch playlist";
      toast.error(message);
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
      toast.error("Please select at least one video");
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
      toast.error(message);
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
  const totalInPlaylist = playlist?.total_count || availableCount;
  const missingCount = Math.max(0, totalInPlaylist - availableCount);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-xl mx-auto">
        <div className="relative flex-1">
          <div className="absolute left-3 top-2.5 text-zinc-500">
            <ListOrdered className="h-5 w-5" />
          </div>
          <Input
            placeholder="Paste YouTube Playlist URL..."
            className="pl-10 h-12 bg-background border-input text-foreground"
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

      {/* Progress / Completion Bar */}
      {(isExtracting || isCompleted) && (
        <div className={`bg-zinc-900/50 border ${isCompleted ? 'border-green-500/20 bg-green-500/5' : 'border-zinc-800'} rounded-xl p-6 animate-in fade-in slide-in-from-top-2 transition-all`}>
            {isCompleted ? (
                // Final Summary View
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                             <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-foreground">Extraction Complete!</h3>
                             <p className="text-muted-foreground text-sm">
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

                    {/* Grouped failure summary */}
                    {(() => {
                      const vals = Object.values(videoStatuses);
                      const botOrTimeout = vals.filter(s => s === 'bot_detection' || s === 'timeout').length;
                      const ageRestricted = vals.filter(s => s === 'age_restricted').length;
                      const membersOnly = vals.filter(s => s === 'members_only').length;
                      const youtubeRestricted = vals.filter(s => s === 'youtube_restricted').length;
                      const extractionError = vals.filter(s => s === 'error').length;
                      const groups: string[] = [
                        ...(botOrTimeout > 0 ? [`⚠️ ${botOrTimeout} video${botOrTimeout !== 1 ? 's' : ''} were temporarily blocked by YouTube. These were retried automatically — if still failing, try again later or use Audio Upload.`] : []),
                        ...(ageRestricted > 0 ? [`🔞 ${ageRestricted} video${ageRestricted !== 1 ? 's' : ''} ${ageRestricted !== 1 ? 'are' : 'is'} age-restricted. YouTube prevents transcription of these videos. Download the audio manually and use Audio Upload instead.`] : []),
                        ...(membersOnly > 0 ? [`🔒 ${membersOnly} video${membersOnly !== 1 ? 's' : ''} are members-only. You need a channel membership to access these videos.`] : []),
                        ...(youtubeRestricted > 0 ? [`🚫 ${youtubeRestricted} video${youtubeRestricted !== 1 ? 's' : ''} are unavailable or restricted on YouTube.`] : []),
                        ...(extractionError > 0 ? [`❌ ${extractionError} video${extractionError !== 1 ? 's' : ''} failed due to an unexpected error. Try again later.`] : []),
                      ];
                      if (groups.length === 0) return null;
                      return (
                        <div className="flex flex-col gap-1.5 p-3 bg-muted/50 border border-border rounded-lg">
                          {groups.map((msg, i) => (
                            <p key={i} className="text-sm text-muted-foreground leading-snug">{msg}</p>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-3 mt-2">
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            className="bg-background border-border hover:bg-muted text-foreground"
                        >
                            Start New Extraction
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => window.location.href = '/dashboard/library'} // Simple redirect
                        >
                            View in Library
                        </Button>
                    </div>
                </div>
            ) : (
                // In Progress View
                <>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium flex items-center gap-2 text-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Extracting Playlist...
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {Object.values(videoStatuses).filter(s => s === 'success').length} / {Object.keys(videoStatuses).length} completed · {formatElapsed(elapsedSeconds)}
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${(Object.values(videoStatuses).filter(s => s === 'success' || s === 'error' || s === 'unavailable' || s === 'no_speech' || s === 'youtube_restricted' || s === 'age_restricted' || s === 'bot_detection' || s === 'timeout' || s === 'members_only').length / Math.max(1, Object.keys(videoStatuses).length)) * 100}%` }}
                        />
                    </div>
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
        <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ListMusic className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground truncate max-w-[300px] md:max-w-md">
                  {playlist.title}
                </h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedIds.size} of {availableCount} available videos selected
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={selectAll}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button 
                      onClick={deselectAll}
                      className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
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
            <div className="px-6 py-2 bg-amber-500/10 border-b border-border flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs font-medium">
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
                          ? "opacity-50 cursor-not-allowed border-transparent bg-muted/20" 
                          : selectedIds.has(entry.id)
                            ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20 cursor-pointer"
                            : "bg-transparent border-transparent hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => !isPrivate && toggleSelection(entry.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => !isPrivate && toggleSelection(entry.id)}
                        disabled={isPrivate}
                        className="border-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {entry.thumbnail && (
                        <div className="relative h-12 w-20 rounded-lg overflow-hidden shrink-0 border border-border">
                          <Image
                            src={entry.thumbnail}
                            alt={entry.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm text-foreground truncate font-medium">
                            {entry.title}
                          </span>
                          {!hasExtracted && idx < 3 && !isPrivate && (
                            <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded shrink-0">Free</span>
                          )}
                          {videoStatuses[entry.id] === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                          {videoStatuses[entry.id] === 'error' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          {videoStatuses[entry.id] === 'unavailable' && <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />}
                          {(videoStatuses[entry.id] === 'youtube_restricted' || videoStatuses[entry.id] === 'bot_detection' || videoStatuses[entry.id] === 'timeout') && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                          {(videoStatuses[entry.id] === 'age_restricted' || videoStatuses[entry.id] === 'members_only') && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                          {videoStatuses[entry.id] === 'extracting' && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                        </div>
                        {entry.duration && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(entry.duration / 60)}:{Math.floor(entry.duration % 60).toString().padStart(2, '0')}
                            </span>
                            {freeVideoIds?.has(entry.id) && <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">Free</span>}
                            {videoStatuses[entry.id] === 'unavailable' && <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Unavailable</span>}
                            {videoStatuses[entry.id] === 'error' && <span className="text-[10px] uppercase font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Failed</span>}
                            {videoStatuses[entry.id] === 'no_speech' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">No speech detected</span>}
                            {videoStatuses[entry.id] === 'youtube_restricted' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Unavailable</span>}
                            {videoStatuses[entry.id] === 'bot_detection' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Temporarily blocked</span>}
                            {videoStatuses[entry.id] === 'timeout' && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Connection timeout</span>}
                            {videoStatuses[entry.id] === 'age_restricted' && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Age-restricted</span>}
                            {videoStatuses[entry.id] === 'members_only' && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Members only</span>}
                             
                             {/* Duplicate Badges */}
                             {!hasExtracted && existingDuplicates[entry.id] && (() => {
                               const entries = existingDuplicates[entry.id];
                               const captionsEntry = entries.find(e => e.processingMethod === 'youtube_captions');
                               const whisperEntry = entries.find(e => e.processingMethod === 'whisper_ai' || e.processingMethod === 'assemblyai');
                               return (
                                 <>
                                   {captionsEntry && (
                                     <a
                                       href={`/dashboard/library/${captionsEntry.transcriptId}`}
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
                                       href={`/dashboard/library/${whisperEntry.transcriptId}`}
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
                                 <AlertCircle className="h-3 w-3" /> Whisper
                               </span>
                             )}
                          </div>
                        )}

                        {/* YouTube Restricted Expanded Message */}
                        {videoStatuses[entry.id] === 'youtube_restricted' && (
                          <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-600 dark:text-amber-500 mb-2">
                              This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload via our Audio Upload tab.
                            </p>
                            {onSwitchToAudio && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSwitchToAudio();
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
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
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border border-dashed"
                  onClick={loadMore}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More ({availableCount - visibleCount} more)
                </Button>
              )}
            </div>
          </ScrollArea>
          {!hasExtracted && (
            <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>The first 3 videos are always free. Credits apply from video 4 onwards.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
