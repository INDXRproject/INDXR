"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ListOrdered, CheckCircle2, AlertCircle, ChevronDown, Search, XCircle, Clock, ListMusic } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { validateYouTubeUrl } from "@/utils/youtube";
import { PlaylistAvailabilitySummary } from "@/components/PlaylistAvailabilitySummary";
import { useAuth } from "@/hooks/useAuth";

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

export type VideoStatus = 'pending' | 'extracting' | 'success' | 'error' | 'unavailable'

interface PlaylistManagerProps {
  onExtract: (videoIds: string[], availabilityData?: VideoAvailability[]) => void;
  isExtracting: boolean;
  videoStatuses?: Record<string, VideoStatus>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onError: (message: string | null) => void;
}

export function PlaylistManager({ onExtract, isExtracting, videoStatuses = {}, isAuthenticated, onAuthRequired, onError }: PlaylistManagerProps) {
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
  const [hasExtracted, setHasExtracted] = useState(false);

  // Monitor extraction progress
  useEffect(() => {
    if (!isExtracting && Object.keys(videoStatuses).length > 0) {
      // Check if all are done (success or error)
      const allDone = Object.values(videoStatuses).every(s => s === 'success' || s === 'error' || s === 'unavailable')
      if (allDone) {
         setIsCompleted(true)
         refreshCredits()
      }
    } else if (isExtracting) {
      setIsCompleted(false)
    }
  }, [isExtracting, videoStatuses, refreshCredits])

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
      // Select first 10 by default, filtering out private videos
      const validEntries = data.entries.slice(0, 10).filter((e: PlaylistEntry) => 
        e.title !== "[Private video]" && e.title !== "[Private Video]" && e.title !== "Private video"
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
      let needsWhisper = 0;
      const unavailable = 0;
      let totalCredits = 0;

      for (const id of selectedIds) {
        const entry = playlist?.entries.find(e => e.id === id);
        if (!entry) continue;

        total++;
        const duration = entry.duration || 0;
        
        // Logic: Always try Standard Extraction first (Free) because yt-dlp can fetch auto-captions
        // even if the YouTube API reports has_captions=false (which only counts manual subtitles).
        
        let status: 'has_captions' | 'needs_whisper' | 'unavailable' = 'has_captions';
        let credits = 0;

        // Only mark as unavailable/whisper needed if we have stronger signals in the future.
        // For now, we assume everything might have captions to protect users' credits.
        // If Standard Extraction fails, the user will see an error and can decide to retry manually.
        
        status = 'has_captions';
        hasCaptions++;

        // Calculate potential credits just for display info if we wanted to show "Potential Cost if Whisper needed"
        // But for status setting, we stick to FREE.
        const durationMinutes = Math.ceil(duration / 60);
        const potentialCredits = Math.max(1, Math.ceil(durationMinutes / 8));
        
        results.push({
          videoId: entry.id,
          title: entry.title,
          duration: duration,
          thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.id}/mqdefault.jpg`,
          status: 'has_captions', // Force Free Attempt
          estimatedCredits: 0 // Show 0 cost
        });
      }
      
      const summary: AvailabilitySummary = {
          total,
          hasCaptions,
          needsWhisper,
          unavailable,
          totalCredits
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

  const handleProceedWithExtraction = () => {
    // Prevent double extraction
    if (hasExtracted) return;

    // Filter to only extract available videos (has_captions or needs_whisper)
    if (availabilityResults) {
      const extractableIds = availabilityResults
        .filter(r => r.status === 'has_captions' || r.status === 'needs_whisper')
        .map(r => r.videoId);
      
      setHasExtracted(true);
      setShowAvailabilityModal(false); // Hide inline summary
      onExtract(extractableIds, availabilityResults);
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
            className="pl-10 h-12 bg-zinc-900/50 border-white/10 text-white"
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
                             <h3 className="text-lg font-bold text-white">Extraction Complete!</h3>
                             <p className="text-zinc-400 text-sm">
                                 {Object.values(videoStatuses).filter(s => s === 'success').length}/{Object.keys(videoStatuses).length} processed successfully • {Object.values(videoStatuses).filter(s => s === 'error').length} failed
                             </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                        <Button 
                            onClick={handleReset}
                            variant="outline"
                            className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100"
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
                        <span className="text-sm font-medium flex items-center gap-2 text-white">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Extracting Playlist...
                        </span>
                        <span className="text-xs text-zinc-400">
                            {Object.values(videoStatuses).filter(s => s === 'success').length} / {Object.keys(videoStatuses).length} completed
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${(Object.values(videoStatuses).filter(s => s === 'success' || s === 'error' || s === 'unavailable').length / Math.max(1, Object.keys(videoStatuses).length)) * 100}%` }}
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
          onProceed={handleProceedWithExtraction}
          onCancel={() => {
             setShowAvailabilityModal(false);
             setAvailabilityResults(null);
             setAvailabilitySummary(null);
          }}
        />
      )}

      {playlist && !showAvailabilityModal && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ListMusic className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white truncate max-w-[300px] md:max-w-md">
                  {playlist.title}
                </h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-zinc-400">
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
                      className="text-xs text-zinc-500 hover:text-zinc-400 font-medium transition-colors"
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
            <div className="px-6 py-2 bg-amber-500/10 border-b border-zinc-800 flex items-center gap-2 text-amber-500 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{missingCount} videos unavailable (private, members-only, or deleted). Showing {availableCount} available videos.</span>
            </div>
          )}

          <ScrollArea className="h-[400px]">
            <div className="p-4 grid gap-2">
              {playlist?.entries?.slice(0, visibleCount).map((entry) => {
                  const isPrivate = entry.title === "[Private video]" || entry.title === "[Private Video]" || entry.title === "Private video";
                  
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all border ${
                        isPrivate 
                          ? "opacity-50 cursor-not-allowed border-transparent bg-zinc-900/20" 
                          : selectedIds.has(entry.id)
                            ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20 cursor-pointer"
                            : "bg-transparent border-transparent hover:bg-zinc-800/50 cursor-pointer"
                      }`}
                      onClick={() => !isPrivate && toggleSelection(entry.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => !isPrivate && toggleSelection(entry.id)}
                        disabled={isPrivate}
                        className="border-zinc-700"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {entry.thumbnail && (
                        <div className="relative h-12 w-20 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
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
                          <span className="text-sm text-zinc-200 truncate font-medium">
                            {entry.title}
                          </span>
                          {videoStatuses[entry.id] === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                          {videoStatuses[entry.id] === 'error' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          {videoStatuses[entry.id] === 'unavailable' && <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />}
                          {videoStatuses[entry.id] === 'extracting' && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                        </div>
                        {entry.duration && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(entry.duration / 60)}:{Math.floor(entry.duration % 60).toString().padStart(2, '0')}
                            </span>
                            {videoStatuses[entry.id] === 'unavailable' && <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">Unavailable</span>}
                            {videoStatuses[entry.id] === 'error' && <span className="text-[10px] uppercase font-bold text-red-900 bg-red-500/20 px-1.5 py-0.5 rounded">Failed</span>}
                             {/* Show Whisper Needed badge if checked */}
                             {availabilityResults?.find(r => r.videoId === entry.id)?.status === 'needs_whisper' && (
                               <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                 <AlertCircle className="h-3 w-3" /> Whisper
                               </span>
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
                  className="w-full mt-2 h-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-zinc-900 border-dashed"
                  onClick={loadMore}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More ({availableCount - visibleCount} more)
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
