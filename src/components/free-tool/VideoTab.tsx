"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useRef } from "react"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { TranscriptCard, TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { toast } from "sonner"
import { validateYouTubeUrl, YouTubeUrlType } from "@/utils/youtube"
import { WhisperFallbackModal } from "@/components/free-tool/WhisperFallbackModal"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import posthog from "posthog-js"

interface VideoTabProps {
  onPlaylistDetected?: () => void
  onTranscriptLoaded?: (transcript: TranscriptItem[], metadata: TranscriptMetadata) => void
}

export function VideoTab({ onPlaylistDetected, onTranscriptLoaded }: VideoTabProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [error, setError] = useState<{ message: string, type?: YouTubeUrlType } | null>(null)
  const [isPlaylistUrl, setIsPlaylistUrl] = useState(false)
  const [showWhisperModal, setShowWhisperModal] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [whisperMetadata, setWhisperMetadata] = useState<{ duration: number; creditsUsed: number } | null>(null)
  const [lastProcessingMethod, setLastProcessingMethod] = useState<'youtube_captions' | 'whisper_ai' | null>(null)
  const [isReextracting, setIsReextracting] = useState(false)
  const { credits, refreshCredits } = useAuth()

  // Add navigation guard during extraction
  useEffect(() => {
    if (!isReextracting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isReextracting]);

  const [existingTranscriptId, setExistingTranscriptId] = useState<string | null>(null)
  const [existingTranscriptMethod, setExistingTranscriptMethod] = useState<string | null>(null)
  const [showDuplicateChoices, setShowDuplicateChoices] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  // In-memory set tracking "videoId:processingMethod" keys saved in this page session
  const sessionSavedKeys = useRef<Set<string>>(new Set())
  const supabase = createClient()

  // Debounce duplicate check on URL change
  // Key = video_id + processing_method (auto_captions & whisper_ai are separate)
  useEffect(() => {
    setIsCheckingDuplicate(!!url)
    const timer = setTimeout(async () => {
      if (!url) { 
        setExistingTranscriptId(null);
        setExistingTranscriptMethod(null);
        setShowDuplicateChoices(false); 
        setIsCheckingDuplicate(false);
        return 
      }
      const validation = validateYouTubeUrl(url, 'video')
      if (validation.type !== 'VALID_VIDEO') {
        setIsCheckingDuplicate(false)
        return
      }

      // Extract video ID
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : "";

      if (videoId) {
        // Check in-memory session first (instant, no network)
        const captionsKey = `${videoId}:youtube_captions`;
        const whisperKey = `${videoId}:whisper_ai`;
        const sessionHasCaptions = sessionSavedKeys.current.has(captionsKey);
        const sessionHasWhisper = sessionSavedKeys.current.has(whisperKey);

        if (sessionHasCaptions || sessionHasWhisper) {
          // In-session hit: find the transcript ID from DB for the link
          const method = sessionHasCaptions ? 'youtube_captions' : 'whisper_ai';
          const { data } = await supabase
            .from('transcripts')
            .select('id')
            .eq('video_id', videoId)
            .eq('processing_method', method)
            .limit(1)
            .maybeSingle();
          setExistingTranscriptId(data?.id ?? null);
          setExistingTranscriptMethod(method);
          setShowDuplicateChoices(false);
          setIsCheckingDuplicate(false);
          return;
        }

        // DB check: look for youtube_captions first (most common)
        const { data: captionsRow } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('processing_method', 'youtube_captions')
          .limit(1)
          .maybeSingle();

        if (captionsRow) {
          setExistingTranscriptId(captionsRow.id);
          setExistingTranscriptMethod('youtube_captions');
          setShowDuplicateChoices(false);
          setIsCheckingDuplicate(false);
          return;
        }

        // DB check: whisper_ai
        const { data: whisperRow } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('processing_method', 'whisper_ai')
          .limit(1)
          .maybeSingle();

        setExistingTranscriptId(whisperRow?.id ?? null);
        setExistingTranscriptMethod(whisperRow ? 'whisper_ai' : null);
        setShowDuplicateChoices(false);
      }
      setIsCheckingDuplicate(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [url, supabase])

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    
    // Detect if the URL is a playlist for the smart suggestion
    const validation = validateYouTubeUrl(newUrl, 'video')
    setIsPlaylistUrl(validation.type === 'PLAYLIST_IN_VIDEO')
    
    // Clear validation-only errors when URL changes
    if (error && ['NON_YOUTUBE', 'MALFORMED', 'PLAYLIST_IN_VIDEO'].includes(error.type || '')) {
      setError(null)
    }
  }

  const handleExtract = async (videoIdOrUrl?: string) => {
    const targetUrl = videoIdOrUrl || url
    if (!targetUrl) return

    // Perform validation before extraction
    const validation = validateYouTubeUrl(targetUrl, 'video')
    if (validation.type !== 'VALID_VIDEO') {
      let message = "Something went wrong"
      switch(validation.type) {
        case 'NON_YOUTUBE':
          message = "Please enter a valid YouTube URL (e.g., youtube.com/watch?v=...)"
          break
        case 'PLAYLIST_IN_VIDEO':
          message = "This is a playlist URL. Use the Playlist tab to extract multiple videos."
          break
        case 'MALFORMED':
          message = "This doesn't look like a valid YouTube link. Please check and try again."
          break
      }
      setError({ message, type: validation.type })
      return
    }

    // Duplicate intercept: pause and ask for confirmation before proceeding
    if (existingTranscriptId && !showDuplicateChoices) {
      setShowDuplicateChoices(true)
      return
    }
    // If showDuplicateChoices is true here, user clicked "Toch extraheren"
    setShowDuplicateChoices(false)
    
    // Proceed with extraction. Default action is normal insert
    setLoading(true)
    setTranscript(null)
    setError(null)
    setVideoDuration(null)
    
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIdOrUrl: targetUrl }),
      })
      
      const data = await response.json()
      
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to extract transcript')
      }
      
      setTranscript(data.transcript)
      setVideoTitle(data.title || "")
      setVideoUrl(data.video_url || targetUrl)
      setVideoDuration(data.duration || null)
      setLastProcessingMethod('youtube_captions')
      setWhisperMetadata(null)
      
      // Store current video id for upsell
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
      const match = (data.video_url || targetUrl).match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : "";
      if (videoId) {
        setCurrentVideoId(videoId);
        // In-memory session tracking so repeat extractions on same page are detected instantly
        sessionSavedKeys.current.add(`${videoId}:youtube_captions`);
        setExistingTranscriptMethod('youtube_captions');
      }

      // Track in PostHog
      posthog.capture('transcript_extracted', {
          type: 'video',
          credits_used: 0, // YouTube captions are free in this flow (non-Whisper)
          processing_method: 'youtube_captions'
      })
      
      if (data.transcript && data.transcript.length > 0) {
        toast.success("Transcript extracted & saved", {
          description: "Added to your library automatically.",
          action: {
            label: "View",
            onClick: () => window.location.href = '/dashboard/library'
          }
        })

        if (onTranscriptLoaded) {
           // Extract ID helper
           const regExp2 = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
           const match2 = (data.video_url || targetUrl).match(regExp2);
           const videoId2 = (match2 && match2[2].length === 11) ? match2[2] : "";

           await onTranscriptLoaded(data.transcript, {
             source: 'youtube',
             title: data.title,
             videoId: videoId2,
             videoUrl: data.video_url || targetUrl,
             duration: data.duration || 0,
             processingMethod: 'youtube_captions'
           })

           // Now record is in DB — fetch its ID so the duplicate banner shows immediately
           if (videoId2) {
             const { data: saved } = await supabase
               .from('transcripts')
               .select('id')
               .eq('video_id', videoId2)
               .eq('processing_method', 'youtube_captions')
               .order('created_at', { ascending: false })
               .limit(1)
               .maybeSingle();
             if (saved) setExistingTranscriptId(saved.id);
           }
        }

      } else {
        toast.info("Video has no captions available")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"
      
      // Check if error is due to no captions available
      if (errorMessage.includes("No captions") || errorMessage.includes("captions")) {
        // Extract video ID for Whisper fallback
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
        const match = targetUrl.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : "";
        
        if (videoId) {
          setCurrentVideoId(videoId)
          setShowWhisperModal(true)
          return // Don't show error, show modal instead
        }
      }
      
      setError({ message: errorMessage })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setShowDuplicateChoices(false)
    }
  }



  const handleWhisperSuccess = async (transcript: TranscriptItem[], metadata: { videoId: string; title: string; duration: number; creditsUsed: number; source: string }) => {
    setTranscript(transcript)
    setVideoTitle(metadata.title || "")
    setVideoUrl(`https://www.youtube.com/watch?v=${metadata.videoId}`)
    setWhisperMetadata({ duration: metadata.duration, creditsUsed: metadata.creditsUsed })
    setLastProcessingMethod('whisper_ai')
    // Track whisper save in session so a second click is instantly flagged as duplicate
    sessionSavedKeys.current.add(`${metadata.videoId}:whisper_ai`);
    setExistingTranscriptMethod('whisper_ai');
    
    // Auto-save: always INSERT a NEW record — never overwrite the existing auto-captions transcript
    setSaveStatus('saving')
    
    if (onTranscriptLoaded) {
      try {
        await onTranscriptLoaded(transcript, {
          source: 'youtube',
          title: metadata.title,
          videoId: metadata.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${metadata.videoId}`,
          duration: metadata.duration,
          creditsUsed: metadata.creditsUsed,
          processingMethod: 'whisper_ai',
          // Explicitly NO duplicateId — always creates a new record
          // Bug 3 fix: original auto-captions transcript stays untouched
        })
        setSaveStatus('saved')

        // Record is now in DB — fetch its ID so the duplicate banner shows immediately
        const { data: saved } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', metadata.videoId)
          .eq('processing_method', 'whisper_ai')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (saved) setExistingTranscriptId(saved.id);
      } catch (error) {
        console.error('Failed to save Whisper transcript:', error)
        setSaveStatus('error')
      }
    }
  }

  const handleWhisperError = (errorMessage: string) => {
    setError({ message: errorMessage })
    toast.error(errorMessage)
  }

  const handleWhisperUpsell = async () => {
    if (!currentVideoId) return;
    posthog.capture('whisper_upsell_clicked');
    
    setLoading(true);
    setIsReextracting(true);
    setError(null);
    setTranscript(null); // Clear current transcript to show loading

    try {
      const formData = new FormData();
      formData.append('source_type', 'youtube');
      formData.append('video_id', currentVideoId);
      // Bug 3: do NOT append transcript_id — we always want a fresh INSERT

      const response = await fetch('/api/transcribe/whisper', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to extract transcript with Whisper AI');

      posthog.capture('transcript_extracted', {
          type: 'video',
          credits_used: data.credits_used || 1,
          processing_method: 'whisper_ai'
      });
      
      // Bug 2 fix: await handleWhisperSuccess so the Supabase INSERT
      // completes before refreshCredits() queries the updated balance
      await handleWhisperSuccess(data.transcript, {
         videoId: currentVideoId,
         title: videoTitle,
         duration: data.duration,
         creditsUsed: data.credits_used || 1,
         source: 'youtube'
      });
      
      refreshCredits();
    } catch (err: unknown) {
      console.error('[WHISPER UPSELL] ERROR caught:', err);
      const errMsg = err instanceof Error ? err.message : 'Whisper extraction failed';
      const isYouTubeRestricted = errMsg.includes('152') || errMsg.toLowerCase().includes('unavailable');
      handleWhisperError(
        isYouTubeRestricted
          ? "This video can't be transcribed with Whisper AI due to YouTube restrictions. Try a different video or upload the audio file manually via the Audio Upload tab."
          : errMsg
      );
    } finally {
      setLoading(false);
      setIsReextracting(false);
    }
  }


  return (
    <div className="mt-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-4 max-w-xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-3.5 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <Input 
              placeholder="https://www.youtube.com/watch?v=..." 
              className={cn(
                "pl-10 h-12 bg-background border-input text-foreground transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !showDuplicateChoices && handleExtract()}
            />
           </div>
          
          {!showDuplicateChoices && (
            <Button 
              size="lg" 
              className="h-12 px-6 w-full sm:w-auto min-w-[120px]" 
              onClick={() => handleExtract()} 
              disabled={loading || !url || isCheckingDuplicate}
            >
              {loading || isCheckingDuplicate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Extracting" : isCheckingDuplicate ? "Checking..." : "Extract"}
            </Button>
          )}
        </div>
        
        {/* Duplicate pause-and-confirm prompt */}
        {existingTranscriptId && showDuplicateChoices && (
          <div className="px-1 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">Je hebt dit transcript al. Opnieuw extraheren?</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <Link
                href={`/dashboard/library/${existingTranscriptId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Bekijk in library
              </Link>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <button
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={() => handleExtract()}
              >
                Toch extraheren
              </button>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <button
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={() => setShowDuplicateChoices(false)}
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {/* Soft info banner: shown when duplicate exists but prompt is not active */}
        {existingTranscriptId && !showDuplicateChoices && (
          <div className="px-1 -mt-1 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {existingTranscriptMethod === 'whisper_ai'
                ? 'Je hebt dit transcript al (Whisper AI) — '
                : 'Je hebt dit transcript al — '}
            </span>
            <Link href={`/dashboard/library/${existingTranscriptId}`} className="font-medium hover:underline">
              bekijk het in je library
            </Link>
          </div>
        )}

        {/* Normal error text */}
        {!existingTranscriptId && !showDuplicateChoices && (
          <div className="flex justify-between items-start px-1">
             <p className={cn("text-sm text-muted-foreground", error && "text-destructive")}>
               {error ? error.message : "Paste any YouTube video URL to extract captions"}
             </p>
          </div>
        )}
      </div>

      {/* Playlist Detection Banner */}
      {isPlaylistUrl && (
        <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-left animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground font-medium">Playlist detected</p>
              <p className="text-sm text-muted-foreground">Would you like to switch to the Playlist tab to extract multiple videos?</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPlaylistDetected}
            className="bg-background hover:bg-muted"
          >
            Switch to Playlist
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !transcript && (
          <div className="w-full max-w-4xl mx-auto mt-8">
             <CardSkeleton />
          </div>
      )}

      {/* Transcript Display */}
      {transcript !== null && transcript.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          
          {/* Whisper Promo Banner */}
          {lastProcessingMethod === 'youtube_captions' && (credits !== null) && (() => {
             const requiredCredits = videoDuration ? Math.ceil(videoDuration / 600) : 1;
             const hasEnoughCredits = credits >= requiredCredits;
             return (
               <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-left gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div>
                   <span className="text-sm text-amber-600 dark:text-amber-500 font-medium block">Not happy with the auto-captions?</span>
                   <span className="text-xs text-muted-foreground mt-1 block">
                     {hasEnoughCredits ? (
                       `You have ${credits} credits remaining`
                     ) : (
                       <Link href="/dashboard/credits" className="text-amber-600 hover:text-amber-700 hover:underline">
                         Not enough credits — top up
                       </Link>
                     )}
                   </span>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={handleWhisperUpsell}
                   className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/20 h-9 font-semibold whitespace-nowrap"
                   disabled={loading || isReextracting || !hasEnoughCredits}
                 >
                   {isReextracting ? (
                     <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Extracting...</>
                   ) : (
                     `✨ Re-extract with Whisper AI · ${requiredCredits} credit${requiredCredits !== 1 ? 's' : ''}`
                   )}
                 </Button>
               </div>
             );
          })()}

          <TranscriptCard transcript={transcript} videoTitle={videoTitle} videoUrl={videoUrl} />
        </div>
      ) : !loading && !transcript && (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
          <p>Transcript results will appear here</p>
        </div>
      )}
      
      {/* No Captions Warning */}
      {transcript !== null && transcript.length === 0 && !loading && (
        <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm">
          No captions available for this video
        </div>
      )}
      
      {/* Success Banner for Whisper Transcription */}
      {saveStatus === 'saved' && whisperMetadata && (
        <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-left animate-in fade-in duration-300">
          <div className="flex-1">
            <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Transcript saved to library</p>
            <p className="text-xs text-muted-foreground">
              Used {whisperMetadata.creditsUsed} credits • {Math.round(whisperMetadata.duration / 60)} minutes
            </p>
          </div>
          <Link href="/dashboard/library">
            <Button variant="outline" size="sm" className="ml-4">
              View in Library
            </Button>
          </Link>
        </div>
      )}

      {/* Whisper Fallback Modal */}
      <WhisperFallbackModal
        open={showWhisperModal}
        onOpenChange={setShowWhisperModal}
        videoId={currentVideoId}
        videoTitle={videoTitle || "YouTube Video"}
        onSuccess={handleWhisperSuccess}
        onError={handleWhisperError}
      />
    </div>
  )
}
