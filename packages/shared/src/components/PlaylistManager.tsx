"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, Search, XCircle, Clock, ListMusic, Mic, ExternalLink, Info, RefreshCw } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { validateYouTubeUrl } from "../utils/youtube";
import { PlaylistAvailabilitySummary } from "./PlaylistAvailabilitySummary";
import { useAuth } from "../hooks/useAuth";
import { createClient } from "../utils/supabase/client";
import { cn } from "../lib/utils";
import { appHref } from "../lib/cross-host-links";
import { readJson } from "../lib/http";
import { ResultCardShell } from "./transcribe/ResultCardShell";
import { CostBreakdown, BalanceLine, type CostSegment } from "./transcribe/CostBreakdown";
import { MethodBadge } from "./transcribe/MethodBadge";
import { ErrorCard } from "./transcribe/ErrorCard";
import { resolveErrorCopy } from "./transcribe/errorCopy";
import { SpellingHintsField } from "./transcribe/SpellingHintsField";
import { CREDIT_COSTS, FREE_TIER, playlistFreeIds } from "../lib/pricing";
import { MAX_PLAYLIST_VIDEOS_PER_JOB, PLAYLIST_LARGE_JOB_WARN_AT } from "../lib/limits";
import type { ReceiptData } from "../hooks/useCompletionReceipt";
import { NOTICE_BAR, NOTICE_BASE, NOTICE_BODY, NOTICE_ICON, NOTICE_TITLE, noticeCompact } from "../lib/notice";

// Stijl B status chips on the per-video rows: ink hairline frame, tone carried by the text colour.
const CHIP = "text-[10px] uppercase font-bold px-1.5 py-0.5 border border-border-strong bg-bg";
const CHIP_ERROR = `${CHIP} text-error`;
const CHIP_WARN = `${CHIP} text-warning-fg`;
const CHIP_OK = `${CHIP} text-success-fg`;
const CHIP_MUTED = `${CHIP} text-fg`;

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

/** "Add to" choice from the review step (Gevonden 9-11 A3) — either an existing collection by id,
 *  or a fresh one named after the playlist (handleExtract creates it). */
export type CollectionChoice = { mode: 'existing'; id: string } | { mode: 'new' };

interface PlaylistManagerProps {
  onExtract: (
    videoIds: string[],
    availabilityData?: VideoAvailability[],
    playlistTitle?: string,
    playlistUrl?: string,
    collectionChoice?: CollectionChoice,
    spellingHints?: string[],
  ) => void;
  isExtracting: boolean;
  videoStatuses?: Record<string, VideoStatus>;
  /** Raw backend error_type per failed video (populated at completion). Lets the failure blocks
      key each card on the real code via the copy map, so an unmapped code shows the neutral card
      with the code instead of a bare "Failed" (point 1). */
  videoErrorCodes?: Record<string, string>;
  freeVideoIds?: Set<string>;
  whisperVideoIds?: Set<string>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onError: (message: string | null) => void;
  onSwitchToAudio?: () => void;
  onRetryVideo?: (videoId: string) => void;
  onRetryAll?: (videoIds: string[]) => void;
  /** How many manual "Retry all" rounds have run (0 = none yet). Kept on the job for the
      operations telemetry built elsewhere; here it shifts the failure-block tone and the
      progress header ("Retry round N"). */
  retryRound?: number;
  /** Credit cost of retrying the failed set, once the backend estimate is available. When set,
      the retry button shows "Retry all N — X credits" and a full balance line; until then we show
      no half number (ADR-080 point 5). */
  retryEstimate?: number | null;
  elapsedSeconds?: number;
  resumePlaylist?: { title: string; entries: PlaylistEntry[] } | null;
  receipt?: ReceiptData;
  /** keyterms-ADR: one spelling-hints list for the whole playlist job, lifted to PlaylistTab so it
      also feeds the retry-job payload. */
  spellingHints?: string[];
  onSpellingHintsChange?: (terms: string[]) => void;
  recentSpellingHints?: string[][];
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistManager({ onExtract, isExtracting, videoStatuses = {}, videoErrorCodes = {}, freeVideoIds, whisperVideoIds, isAuthenticated, onAuthRequired, onError, onSwitchToAudio, onRetryAll, elapsedSeconds = 0, resumePlaylist, receipt, retryRound = 0, retryEstimate = null, spellingHints = [], onSpellingHintsChange, recentSpellingHints = [] }: PlaylistManagerProps) {
  const { credits, refreshCredits } = useAuth()
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllFailed, setShowAllFailed] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);
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
  // "Add to" picker (Gevonden 9-11 A3): the user's collections, and the choice — defaults to
  // whichever existing collection already holds the most videos from this playlist, else "new".
  const [userCollections, setUserCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [collectionChoice, setCollectionChoice] = useState<CollectionChoice>({ mode: 'new' });
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
      if (validation.type === 'CHANNEL') message = "INDXR extracts videos and playlists, not entire channels. Create a playlist from the channel's videos (YouTube Studio or a public playlist) and paste that playlist URL — or paste a single video URL.";
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

      // Never JSON.parse a non-JSON body (e.g. a 404 HTML page when the route is absent) — that used
      // to surface a raw "Unexpected token '<'" SyntaxError in the UI. readJson throws a clean,
      // typed error instead; a structured backend error (JSON with a status) still flows through below.
      const data = await readJson<{ title: string; entries: PlaylistEntry[]; total_count?: number; unavailable_count?: number; error?: string }>(response);

      if (!response.ok) throw new Error(data.error || "Failed to fetch playlist");

      setPlaylist(data);
      
      // Fetch duplicates in background or await here so we can uncheck them
      const videoIds = data.entries.map((e: PlaylistEntry) => e.id);
      
      // We safely fetch the first 1000 items (unlikely to have a 1000+ playlist here)
      const { data: { user } } = await supabase.auth.getUser()
      const dupes: Record<string, Array<{ transcriptId: string; processingMethod: string }>> = {}
      const collectionCounts: Record<string, number> = {}
      if (user && videoIds.length > 0) {
        // Query Supabase — also collection_id (A3): finds which existing collection already holds
        // videos from this playlist, so "Add to" can default to it instead of always making a new one.
        const [{ data: existing }, { data: cols }] = await Promise.all([
          supabase.from('transcripts').select('id, video_id, processing_method, collection_id').eq('user_id', user.id).in('video_id', videoIds),
          supabase.from('collections').select('id, name').eq('user_id', user.id),
        ])

        if (existing) {
          existing.forEach(t => {
            if (!dupes[t.video_id]) dupes[t.video_id] = []
            dupes[t.video_id].push({ transcriptId: t.id, processingMethod: t.processing_method || 'youtube_captions' })
            if (t.collection_id) collectionCounts[t.collection_id] = (collectionCounts[t.collection_id] ?? 0) + 1
          })
        }
        setUserCollections(cols ?? []);
      }
      setExistingDuplicates(dupes);

      // Default "Add to" choice: the collection already holding the most videos from this playlist,
      // else a new one named after the playlist (A3).
      const dominantCollectionId = Object.entries(collectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      setCollectionChoice(dominantCollectionId ? { mode: 'existing', id: dominantCollectionId } : { mode: 'new' });

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
    // Same exclusion as the initial preselect (A3): a video that already has a caption transcript
    // stays unchecked — ticking it would just re-extract a duplicate for no new content.
    const validEntries = playlist.entries.filter(e =>
      e.title !== "[Private video]" && e.title !== "[Private Video]" && e.title !== "Private video" &&
      !existingDuplicates[e.id]?.some(d => d.processingMethod === 'youtube_captions')
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
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
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

      // Inject duplicate logic into the results that go back up (Task 3 dedup-gap fix, 2026-09-12).
      // Dedup on the VIDEO, not just the same method:
      //  - caption wanted (has_captions): skip if ANY transcript already exists for this video — a
      //    caption OR an AI transcript. Re-extracting a caption when the video is already in the library
      //    (even as the better AI transcript) just makes a second, inferior copy and costs a credit/slot.
      //    Link to the AI transcript when present, else the caption.
      //  - AI wanted (needs_whisper): skip only if an AI transcript already exists. A caption-only video
      //    is an UPGRADE to AI, not a duplicate — allow it.
      const enhancedResults = finalResults.map(r => {
        const existingEntries = existingDuplicates[r.videoId] || [];
        const aiEntry = existingEntries.find(e => e.processingMethod === 'whisper_ai' || e.processingMethod === 'assemblyai');
        const captionEntry = existingEntries.find(e => e.processingMethod === 'youtube_captions');
        const matchingEntry = r.status === 'needs_whisper' ? aiEntry : (aiEntry ?? captionEntry);
        return {
          ...r,
          duplicateId: matchingEntry?.transcriptId,
          duplicateAction: matchingEntry ? duplicateAction : undefined,
        };
      });

      setHasExtracted(true);
      setShowAvailabilityModal(false); // Hide inline summary
      onExtract(extractableIds, enhancedResults, playlist?.title, url, collectionChoice, spellingHints);
    }
  };

  const availableCount = playlist?.entries?.length || 0;
  // Real count from the backend: playlist items that could not be resolved to a
  // playable video (private/members-only/deleted). Not a cap-driven subtraction.
  const missingCount = playlist?.unavailable_count ?? 0;

  // Derived progress/completion values (presentation only — no job state moved, ADR-080).
  const FAILED_STATES = ['bot_detection', 'timeout', 'error', 'no_captions', 'no_speech', 'members_only', 'age_restricted', 'youtube_restricted'];
  const runEntries = (playlist?.entries ?? resumePlaylist?.entries ?? []).filter(e => videoStatuses[e.id]);
  const compTotal = Object.keys(videoStatuses).length;
  const compSucceededIds = Object.entries(videoStatuses).filter(([, s]) => s === 'success').map(([id]) => id);
  const compSucceeded = compSucceededIds.length;
  const compFailed = Object.values(videoStatuses).filter(s => FAILED_STATES.includes(s as string)).length;
  const compDone = Object.values(videoStatuses).filter(s => s === 'success' || s === 'unavailable' || FAILED_STATES.includes(s as string)).length;
  const compAiSuccess = compSucceededIds.filter(id => whisperVideoIds?.has(id)).length;
  const compCapSuccess = compSucceeded - compAiSuccess;
  // Per-method charged credits, split from the authoritative per-video receipt breakdown
  // (receipt.videos[].credits) by the method map (whisperVideoIds). Reconciles with receipt.used
  // when the breakdown is present; when it isn't, the amounts fall back to '' (counts only).
  const compChargedVideos = (receipt?.videos ?? []).filter(v => v.state === 'charged');
  const compHasBreakdown = compChargedVideos.length > 0;
  const compAiCredits = compChargedVideos.filter(v => whisperVideoIds?.has(v.videoId)).reduce((a, v) => a + (v.credits ?? 0), 0);
  const compCapCredits = compChargedVideos.filter(v => !whisperVideoIds?.has(v.videoId)).reduce((a, v) => a + (v.credits ?? 0), 0);
  const compRetryableIds = Object.entries(videoStatuses).filter(([, s]) => s === 'bot_detection' || s === 'timeout').map(([id]) => id);
  const compRetryableEntries = (playlist?.entries ?? resumePlaylist?.entries ?? []).filter(e => compRetryableIds.includes(e.id));
  // Round >= 1 means a manual "Retry all" already ran and failures remain → structural tone.
  const compStalled = retryRound >= 1;

  // ADR-071: server caps a single playlist job at 500 videos. Warn early (>=50) so
  // users know large jobs run in the background, and block submit past the hard cap
  // so they get immediate feedback instead of waiting on a server 4xx.
  const selectedCount = selectedIds.size;

  // "Free" badge on the pre-extraction selection list — the SAME per-method rule as the
  // backend, the confirm screen and the receipt (ADR-081): the first N CAPTION videos by
  // playlist position are free, whisper never takes a slot. Before a method is chosen
  // whisperVideoIds is empty, so it degrades to the first N videos (all caption).
  const selectionFreeIds = useMemo(
    () => playlistFreeIds(
      (playlist?.entries ?? []).map(e => e.id),
      whisperVideoIds ? Array.from(whisperVideoIds) : [],
    ),
    [playlist, whisperVideoIds],
  );

  const isOverHardCap = selectedCount > MAX_PLAYLIST_VIDEOS_PER_JOB;
  const isLargeJob = selectedCount >= PLAYLIST_LARGE_JOB_WARN_AT && !isOverHardCap;
  const estimatedMinutes = Math.max(1, Math.round(selectedCount * 11 / 60));

  return (
    <div className="space-y-6">
      {/* Input + pricing — hidden on completion so "Start new extraction" is the only path back
          (ADR-080 point 7); disabled during a run so you can't stack a second extraction. */}
      {!isCompleted && (<>
      <div className="flex flex-col gap-2 max-w-xl mx-auto sm:flex-row sm:gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Paste YouTube Playlist URL..."
            className="h-12 bg-bg border-border text-fg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isExtracting && fetchPlaylistInfo()}
            disabled={isExtracting}
          />
        </div>
        <Button
          size="lg"
          className="h-12 px-6 w-full shrink-0 justify-center sm:w-auto sm:min-w-[150px] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--fg-muted)] disabled:opacity-100"
          onClick={fetchPlaylistInfo}
          disabled={loading || !url || isExtracting}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Fetching…" : "Fetch playlist"}
        </Button>
      </div>
      {/* One-line cost footer (ADR-079) — numbers from pricing.ts. Per-method (ADR-081):
          free slots are for caption videos; AI never takes a slot, so no positional caveat. */}
      <div className="-mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span>
            First {FREE_TIER.PLAYLIST_FREE_VIDEOS} caption videos free · then {CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS} credit/video · AI {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit/min
          </span>
        </div>
      </div>
      </>)}

      {inlineError && (
        <div role="alert" className={cn("flex items-start gap-2", noticeCompact("error"))}>
          <AlertCircle className={cn("h-4 w-4 shrink-0 mt-0.5", NOTICE_ICON.error)} />
          <span className="flex-1">{inlineError}</span>
          <button onClick={() => setInlineError(null)} aria-label="Dismiss" className="shrink-0 font-bold text-fg-strong hover:bg-bg-subtle px-1 cursor-pointer">✕</button>
        </div>
      )}

      {/* Progress / Completion Bar — on the shared ResultCardShell so the batch
          completion reads with identical chrome to single-transcript results (ADR-079) */}
      {(isExtracting || isCompleted) && (
        <ResultCardShell tone={isCompleted && compFailed === 0 ? 'success' : 'default'} className="p-6">
            {isCompleted ? (
                // Final Summary View (mockup C) — neutral unless every video succeeded
                <div className="flex flex-col gap-4">
                    {compFailed === 0 ? (
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", NOTICE_ICON.success)} />
                        <div>
                          <p className="text-[17px] font-bold text-fg-strong">All {compTotal} video{compTotal !== 1 ? 's' : ''} transcribed</p>
                          {finalElapsed > 0 && <p className="mt-0.5 text-[13px] text-fg">Finished in {formatElapsed(finalElapsed)}</p>}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[17px] font-bold text-fg-strong">{compSucceeded} of {compTotal} video{compTotal !== 1 ? 's' : ''} transcribed</p>
                        <p className="mt-0.5 text-[13px] text-fg">
                          {finalElapsed > 0 ? `Finished in ${formatElapsed(finalElapsed)} · ` : ''}{compFailed} could not be processed
                        </p>
                      </div>
                    )}

                    {/* Receipt (mockup C) — method-colour bar + the authoritative Charged total and
                        refund line from the credit receipt (ADR-050 numbers, unchanged). */}
                    {receipt && receipt.used != null && (
                      <CostBreakdown
                        totalLabel="Charged"
                        totalAmount={`${receipt.used} credit${receipt.used !== 1 ? 's' : ''}`}
                        segments={[
                          { key: 'cap', tone: 'captions', count: compCapSuccess, label: `${compCapSuccess} YouTube captions`, amount: compHasBreakdown ? (compCapCredits > 0 ? `${compCapCredits} credit${compCapCredits !== 1 ? 's' : ''}` : 'free') : '' },
                          { key: 'ai', tone: 'ai', count: compAiSuccess, label: `${compAiSuccess} AI transcription`, amount: compHasBreakdown ? `${compAiCredits} credit${compAiCredits !== 1 ? 's' : ''}` : '' },
                          ...(compFailed > 0
                            ? [{
                                key: 'un', tone: 'unavailable', count: compFailed, label: `${compFailed} not fetched`,
                                amount: receipt.refunded ? `${receipt.refunded} credit${receipt.refunded !== 1 ? 's' : ''} refunded` : 'refunded',
                                refund: true,
                              } as CostSegment]
                            : []),
                        ]}
                      />
                    )}

                    {/* Failure block (mockup C) — one explanation, one action. Retryable videos
                        (rate-limited) get "Retry all N" — no per-video retry, no round cap; the
                        tone shifts to structural once a manual retry has already run (ADR-080). */}
                    {compRetryableEntries.length > 0 && (
                      <div className={cn(NOTICE_BASE, NOTICE_BAR.warning, "p-3")}>
                        <p className={cn("mb-1", NOTICE_TITLE)}>{compRetryableEntries.length} video{compRetryableEntries.length !== 1 ? 's' : ''} could not be fetched</p>
                        <p className={cn("mb-3", NOTICE_BODY)}>
                          {compStalled
                            ? "YouTube is structurally blocking these right now. You can keep retrying, but Upload is the reliable alternative."
                            : "YouTube rate-limited these during extraction, and an automatic retry already failed once. Retrying now uses a fresh connection."}
                        </p>
                        <div className="mb-3 divide-y divide-border-subtle overflow-hidden border-2 border-border-strong">
                          {(showAllFailed ? compRetryableEntries : compRetryableEntries.slice(0, 5)).map(e => (
                            <p key={e.id} className="truncate px-3 py-1.5 text-[13px] text-fg-subtle">{e.title}</p>
                          ))}
                        </div>
                        {compRetryableEntries.length > 5 && !showAllFailed && (
                          <button type="button" onClick={() => setShowAllFailed(true)} className="mb-3 block text-xs font-bold text-fg-strong underline underline-offset-4 hover:text-fg cursor-pointer">
                            Show all {compRetryableEntries.length}
                          </button>
                        )}
                        {/* keyterms-ADR follow-up (point 2): retry reuses the original run's hints by
                            default (lifted state in PlaylistTab), but the user may want to add one
                            right before retrying a name that came back wrong — same field, no separate
                            confirm step needed since this block is already a confirm step. */}
                        {onSpellingHintsChange && compRetryableIds.some((id) => whisperVideoIds?.has(id)) && (
                          <SpellingHintsField value={spellingHints} onChange={onSpellingHintsChange} recentLists={recentSpellingHints} />
                        )}
                        {/* Retry is the single action here; Audio Upload lives in the permanent block
                            below (the one place it's the only way in). On < md the button is full-width. */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          {/* Full balance line once the retry estimate is known; until then just the
                              balance, never a half number (ADR-080 point 5). */}
                          {retryEstimate != null
                            ? <BalanceLine have={credits} cost={retryEstimate} />
                            : (credits !== null && <span className="text-[13px] text-fg-subtle">You have {credits} credit{credits !== 1 ? 's' : ''}</span>)}
                          {onRetryAll && (
                            <Button size="sm" disabled={isExtracting} onClick={() => onRetryAll(compRetryableIds)} className="h-9 w-full sm:ml-auto sm:w-auto">
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry all {compRetryableEntries.length}{retryEstimate != null ? ` — ${retryEstimate} credit${retryEstimate === 1 ? '' : 's'}` : ''}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Permanent failures — retrying wouldn't help. One ErrorCard per distinct backend
                        code via the shared copy map (ADR-080), so each reason (members-only, no
                        captions, duration cap, …) gets its own honest card; an UNMAPPED code falls
                        through resolveErrorCopy to the neutral card — code shown + PostHog-logged —
                        instead of a bare "Failed" (point 1). Retryable codes (bot_detection/timeout/
                        connection_error/server_error) live in the block above, not here. */}
                    {(() => {
                      const permIds = Object.entries(videoStatuses)
                        .filter(([, s]) => s === 'members_only' || s === 'age_restricted' || s === 'youtube_restricted' || s === 'no_captions' || s === 'no_speech' || s === 'error')
                        .map(([id]) => id)
                      if (permIds.length === 0) return null
                      // Group by resolved backend code. Fallback to the collapsed status (a valid
                      // copy-map key for the known five) when a raw code wasn't captured (older jobs).
                      const groups = new Map<string, string[]>()
                      for (const id of permIds) {
                        const key = videoErrorCodes[id] || (videoStatuses[id] as string) || 'error'
                        groups.set(key, [...(groups.get(key) ?? []), id])
                      }
                      const titleFor = (id: string) => (playlist?.entries ?? resumePlaylist?.entries ?? []).find(e => e.id === id)?.title ?? id
                      return (
                        <div className="flex flex-col gap-3">
                          {Array.from(groups.entries()).map(([code, ids]) => {
                            const copy = resolveErrorCopy(code, {
                              onSwitchToAudio,
                              contactHref: appHref('/dashboard/messages?tab=support'),
                            })
                            const names = ids.map(titleFor)
                            const note = (
                              <div className="divide-y divide-border-subtle overflow-hidden border-2 border-border-strong">
                                {names.slice(0, 5).map((n, i) => (
                                  <p key={i} className="truncate px-3 py-1.5 text-[13px] text-fg-subtle">{n}</p>
                                ))}
                                {names.length > 5 && (
                                  <p className="px-3 py-1.5 text-xs text-fg-muted">+{names.length - 5} more</p>
                                )}
                              </div>
                            )
                            return <ErrorCard key={code} {...copy} note={note} />
                          })}
                        </div>
                      )
                    })()}

                    {/* Actions — at partial success Retry is the next step so View is secondary;
                        at full success View is primary (mockup C). */}
                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center">
                        <Button variant="outline" size="sm" onClick={handleReset} className="h-9 w-full sm:w-auto">Start new extraction</Button>
                        <a href={appHref('/dashboard/library')} className="w-full sm:ml-auto sm:w-auto">
                            <Button variant={compFailed === 0 ? undefined : 'outline'} size="sm" className="h-9 w-full">
                                View {compSucceeded} in Library
                            </Button>
                        </a>
                    </div>
                </div>
            ) : (
                // In-progress — one status surface (mockup A3): header + bar + per-video rows.
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="mb-2 flex items-baseline gap-2">
                            <span className="font-bold text-fg-strong">{retryRound >= 1 ? `Retrying failed videos · round ${retryRound}` : "Extracting playlist"}</span>
                            <span className="ml-auto font-mono text-xs text-fg">{compSucceeded} / {compTotal} · {formatElapsed(elapsedSeconds)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden border-2 border-border-strong bg-bg">
                            <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${(compDone / Math.max(1, compTotal)) * 100}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-fg">Runs in the background — safe to close this tab.</p>
                    </div>
                    {runEntries.length > 0 && (
                        <div className="divide-y divide-border-subtle overflow-hidden border-2 border-border-strong">
                            {(showAllProgress ? runEntries : runEntries.slice(0, 5)).map(e => {
                                const st = videoStatuses[e.id]
                                const isAi = whisperVideoIds?.has(e.id)
                                return (
                                    <div key={e.id} className="flex items-center gap-2.5 bg-bg px-3 py-2 text-[13px]">
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                            {st === 'success' ? <span className="font-bold text-success-fg">✓</span>
                                              : st === 'extracting' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-strong" />
                                              : st === 'pending' ? <span className="text-fg-muted">○</span>
                                              : <span className="font-bold text-error">✕</span>}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-fg">{e.title}</span>
                                        {(st === 'pending') && <span className="shrink-0 text-xs text-fg-muted">Queued</span>}
                                        {(st !== 'pending' && st !== 'extracting' && st !== 'success') && <span className="shrink-0 text-xs text-fg-muted">Skipped</span>}
                                        <MethodBadge method={isAi ? 'ai' : 'captions'} className="shrink-0">{isAi ? 'AI' : 'Auto'}</MethodBadge>
                                    </div>
                                )
                            })}
                            {runEntries.length > 5 && (
                                <button type="button" onClick={() => setShowAllProgress(v => !v)} className="w-full px-3 py-2 text-center text-xs font-bold text-fg-strong hover:bg-bg-subtle cursor-pointer">
                                    {showAllProgress ? 'Show less' : `Show all ${runEntries.length}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </ResultCardShell>
      )}

      {/* Availability Summary INLINE */}
      {showAvailabilityModal && availabilityResults && availabilitySummary && (
        <PlaylistAvailabilitySummary
          results={availabilityResults}
          summary={availabilitySummary}
          userCredits={credits}
          unavailableCount={missingCount}
          existingDuplicates={existingDuplicates} // <--- Added this line
          collections={userCollections}
          playlistTitle={playlist?.title ?? ''}
          collectionChoice={collectionChoice}
          onCollectionChoiceChange={setCollectionChoice}
          onProceed={handleProceedWithExtraction}
          onCancel={() => {
             setShowAvailabilityModal(false);
             setAvailabilityResults(null);
             setAvailabilitySummary(null);
          }}
          spellingHints={spellingHints}
          onSpellingHintsChange={onSpellingHintsChange ?? (() => {})}
          recentSpellingHints={recentSpellingHints}
        />
      )}

      {playlist && !showAvailabilityModal && !isExtracting && !isCompleted && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header (ADR-080) — title wraps freely; Select-all is one indeterminate checkbox +
              counter; the primary action sits on its own wrapping row so it never collides with
              a long title. */}
          <div className="p-6 border-b border-border bg-surface-elevated/30 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-lg text-accent-fg shrink-0">
                <ListMusic className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-fg leading-snug">{playlist.title}</h3>
                <p className="mt-0.5 text-sm text-fg-muted">{availableCount} video{availableCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={selectedIds.size === availableCount && availableCount > 0 ? 'true' : selectedIds.size === 0 ? 'false' : 'mixed'}
                onClick={() => (selectedIds.size === availableCount ? deselectAll() : selectAll())}
                className="flex min-h-[36px] items-center gap-2 text-sm text-fg-subtle cursor-pointer"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border text-[10px] leading-none",
                  selectedIds.size > 0 ? "bg-accent border-accent text-fg-on-accent" : "border-border-strong"
                )}>
                  {selectedIds.size === availableCount && availableCount > 0 ? '✓' : selectedIds.size > 0 ? '–' : ''}
                </span>
                Select all
              </button>
              <span className="text-xs text-fg-muted">{selectedIds.size} of {availableCount} selected</span>
              {!hasExtracted && (
                <Button
                  onClick={handleCheckAvailability}
                  disabled={isCheckingAvailability || selectedIds.size === 0 || isOverHardCap}
                  className="ml-auto hidden md:inline-flex"
                >
                  {isCheckingAvailability ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparing…</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Review extraction</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Explain the default preselection — it's a starting point, not a limit (the cap is 500). */}
          {!hasExtracted && availableCount > 10 && (
            <div className="px-6 py-2 border-b border-border text-xs text-fg">
              The first videos are preselected to get you started — tick any others below. Up to {MAX_PLAYLIST_VIDEOS_PER_JOB} videos per job.
            </div>
          )}

          {!hasExtracted && isOverHardCap && (
            <div role="alert" className={cn(NOTICE_BASE, NOTICE_BAR.error, "border-r-0 border-t-0 border-b-2 flex items-center gap-2 px-6 py-2 text-xs font-medium")}>
              <AlertCircle className={cn("h-3.5 w-3.5 shrink-0", NOTICE_ICON.error)} />
              <span>You&apos;ve selected {selectedCount} videos. INDXR processes up to {MAX_PLAYLIST_VIDEOS_PER_JOB} per job — deselect some, or split into batches of {MAX_PLAYLIST_VIDEOS_PER_JOB}.</span>
            </div>
          )}

          {!hasExtracted && isLargeJob && (
            <div className={cn(NOTICE_BASE, NOTICE_BAR.warning, "border-r-0 border-t-0 border-b-2 flex items-center gap-2 px-6 py-2 text-xs font-medium")}>
              <AlertCircle className={cn("h-3.5 w-3.5 shrink-0", NOTICE_ICON.warning)} />
              <span>Extracting {selectedCount} videos may take a while (~{estimatedMinutes} min). You can close this tab — extraction continues in the background and appears in your library.</span>
            </div>
          )}

          {missingCount > 0 && (
            <div className={cn(NOTICE_BASE, NOTICE_BAR.warning, "border-r-0 border-t-0 border-b-2 flex items-center gap-2 px-6 py-2 text-xs font-medium")}>
              <AlertCircle className={cn("h-3.5 w-3.5", NOTICE_ICON.warning)} />
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
                        <div className="flex items-center gap-2 mb-0.5 min-w-0">
                          <span className="text-sm text-fg truncate font-medium min-w-0 flex-1">
                            {entry.title}
                          </span>
                          {!hasExtracted && selectionFreeIds.has(entry.id) && !isPrivate && (
                            <span className={cn(CHIP_OK, "shrink-0")}>Free</span>
                          )}
                          {videoStatuses[entry.id] === 'success' && <CheckCircle2 className="h-4 w-4 text-success-fg shrink-0" />}
                          {videoStatuses[entry.id] === 'error' && <XCircle className="h-4 w-4 text-error shrink-0" />}
                          {videoStatuses[entry.id] === 'unavailable' && <XCircle className="h-4 w-4 text-fg-muted shrink-0" />}
                          {(videoStatuses[entry.id] === 'youtube_restricted' || videoStatuses[entry.id] === 'bot_detection' || videoStatuses[entry.id] === 'timeout') && <AlertCircle className="h-4 w-4 text-warning-fg shrink-0" />}
                          {(videoStatuses[entry.id] === 'age_restricted' || videoStatuses[entry.id] === 'members_only') && <XCircle className="h-4 w-4 text-error shrink-0" />}
                          {videoStatuses[entry.id] === 'extracting' && (
                            whisperVideoIds?.has(entry.id) ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-fg-strong shrink-0">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                                </span>
                                Transcribing with AI
                              </span>
                            ) : (
                              <Loader2 className="h-3 w-3 animate-spin text-fg-strong shrink-0" />
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
                              <span className="text-[10px] font-mono text-fg">{formatElapsed(elapsedSeconds)}</span>
                            )}
                            {freeVideoIds?.has(entry.id) && <span className={CHIP_OK}>Free</span>}
                            {videoStatuses[entry.id] === 'unavailable' && <span className={CHIP_MUTED}>Unavailable</span>}
                            {videoStatuses[entry.id] === 'error' && <span className={CHIP_ERROR}>Failed</span>}
                            {videoStatuses[entry.id] === 'no_speech' && <span className={CHIP_WARN}>No speech detected</span>}
                            {videoStatuses[entry.id] === 'youtube_restricted' && <span className={CHIP_WARN}>Unavailable</span>}
                            {videoStatuses[entry.id] === 'bot_detection' && <span className={CHIP_WARN}>Temporarily blocked</span>}
                            {videoStatuses[entry.id] === 'timeout' && <span className={CHIP_WARN}>Connection timeout</span>}
                            {videoStatuses[entry.id] === 'age_restricted' && <span className={CHIP_ERROR}>Age-restricted</span>}
                            {videoStatuses[entry.id] === 'members_only' && <span className={CHIP_ERROR}>Members only</span>}
                            {videoStatuses[entry.id] === 'no_captions' && <span className={CHIP_WARN}>No captions</span>}

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
                                       className={cn(CHIP_WARN, "flex items-center gap-1 hover:bg-bg-subtle transition-colors")}
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
                                       className="text-[10px] uppercase font-bold font-mono text-fg-on-accent bg-accent border border-fg-strong px-1.5 py-0.5 flex items-center gap-1 hover:bg-accent-hover transition-colors"
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
                               <span className={cn(CHIP_WARN, "flex items-center gap-1")}>
                                 <AlertCircle className="h-3 w-3" /> AI
                               </span>
                             )}
                          </div>
                        )}

                        {/* YouTube Restricted Expanded Message */}
                        {videoStatuses[entry.id] === 'youtube_restricted' && (
                          <div className={cn("mt-2", noticeCompact("warning"), "p-2.5")}>
                            <p className="text-xs text-fg mb-2">
                              This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload via our Upload tab.
                            </p>
                            {onSwitchToAudio && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSwitchToAudio();
                                }}
                                className="inline-flex items-center gap-1.5 border-2 border-border-strong bg-bg px-2.5 py-1 text-xs font-bold text-fg-strong hover:bg-bg-subtle transition-colors cursor-pointer"
                              >
                                <Mic className="h-3 w-3" />
                                Try Upload →
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
                    className="w-full mt-2 h-12 font-bold text-fg-strong hover:bg-bg-subtle border-2 border-border-strong"
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
            <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 text-xs text-fg">
              <Info className={cn("h-3.5 w-3.5 shrink-0", NOTICE_ICON.info)} />
              <span>The first {FREE_TIER.PLAYLIST_FREE_VIDEOS} caption videos are always free. YouTube captions after that cost {CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS} credit each; AI is always charged.</span>
            </div>
          )}
        </div>
      )}

      {/* Sticky mobile action bar — keeps "Review extraction" reachable on a long selection list
          (the header button scrolls off). Sits above the tab bar; desktop uses the header button.
          The spacer gives the list room to scroll clear of the sticky bar. */}
      {playlist && !showAvailabilityModal && !isExtracting && !isCompleted && !hasExtracted && (
        <div aria-hidden className="h-[calc(var(--tabbar-h)+4rem)] md:hidden" />
      )}
      {playlist && !showAvailabilityModal && !isExtracting && !isCompleted && !hasExtracted && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.5rem)] z-10 md:hidden">
          <Button
            onClick={handleCheckAvailability}
            disabled={isCheckingAvailability || selectedIds.size === 0 || isOverHardCap}
            className="h-12 w-full"
          >
            {isCheckingAvailability ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparing…</>
            ) : (
              <><Search className="h-4 w-4 mr-2" /> Review extraction · {selectedIds.size} selected</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
