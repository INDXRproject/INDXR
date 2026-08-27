"use client"

// The live free tool, extracted so both /transcribe and the landing page embed the SAME workbench
// (no duplication). Self-contained: handles auth state, auto-save on transcript load, the library-full
// guard, and the sign-up friction cards for the paid paths. All credit/limit numbers render from the
// pricing/limits source. Renders MicroTrustRow for anonymous visitors.

import { useEffect, useState } from "react"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { TranscribeWorkbench } from "@indxr/shared/components/transcribe/TranscribeWorkbench"
import { VideoTab } from "@indxr/shared/components/free-tool/VideoTab"
import { PlaylistTab } from "@indxr/shared/components/free-tool/PlaylistTab"
import { AudioTab } from "@indxr/shared/components/free-tool/AudioTab"
import { TranscriptItem } from "@indxr/shared/components/TranscriptCard"
import { TranscriptMetadata } from "@indxr/shared/types/transcript"
import { MicroTrustRow } from "@indxr/shared/components/MicroTrustRow"
import { FrictionConversionCard } from "@indxr/shared/components/FrictionConversionCard"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

const WELCOME = FREE_TIER.WELCOME_CREDITS
const PER_MIN = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export function FreeToolEmbed() {
  const [showPlaylistFriction, setShowPlaylistFriction] = useState(false)
  const [showVideoAiFriction, setShowVideoAiFriction] = useState(false)
  const [user, setUser] = useState<unknown>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [storageFull, setStorageFull] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { setShowPlaylistFriction(false); setShowVideoAiFriction(false) }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (!hasMounted) return null

  const handleTranscriptLoaded = async (transcript: TranscriptItem[], metadata: TranscriptMetadata) => {
    if (!user) return

    try {
      const duration = transcript.length > 0
        ? Math.ceil(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration)
        : 0
      const characterCount = transcript.reduce((acc, item) => acc + item.text.length, 0)
      const videoId = metadata.videoId || ""
      const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

      const { data: full } = await supabase.rpc("library_storage_is_full", { p_user_id: (user as { id: string }).id })
      if (full) { setStorageFull(true); return }

      await supabase.from("transcripts").insert({
        user_id: (user as { id: string }).id,
        video_id: videoId,
        title: metadata.title || `Video ${videoId}`,
        transcript: transcript,
        duration: duration,
        character_count: characterCount,
        thumbnail_url: thumbnailUrl,
        source_type: metadata.source || "youtube",
        filename: metadata.filename,
        credits_used: metadata.creditsUsed || 0,
        processing_method: metadata.processingMethod || "youtube_captions",
      })
    } catch (err) {
      console.error("Auto-save failed", err)
    }
  }

  return (
    <div className="text-left">
      {storageFull && (
        <div className="mb-6 rounded-xl border border-[var(--error)]/20 bg-[var(--error-subtle)] px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--error-fg)]">Your library is full — this transcript wasn&apos;t saved.</p>
            <p className="text-sm text-[var(--fg-subtle)] mt-1">
              You can still copy or export it below. To save new transcripts, delete some from your library, or buy more space on your account page. Your existing transcripts are safe.
            </p>
          </div>
          <button onClick={() => setStorageFull(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg)] shrink-0 text-xs leading-none" aria-label="Dismiss">✕</button>
        </div>
      )}

      <TranscribeWorkbench
        renderVideo={({ switchMode }) => (
          <>
            <VideoTab
              onPlaylistDetected={() => switchMode("playlist")}
              onTranscriptLoaded={handleTranscriptLoaded}
              onSwitchToAudio={() => switchMode("audio")}
              onAiRequiresAuth={() => setShowVideoAiFriction(true)}
            />
            {!user && showVideoAiFriction && (
              <FrictionConversionCard
                className="mt-6"
                headline="AI transcription needs a free account"
                body={`Sign up free — ${WELCOME} credits included, no credit card needed. AI transcription runs at ${PER_MIN} credit per minute; YouTube captions stay free. Credits never expire.`}
                primaryCtaLabel="Sign up free →"
                primaryCtaHref="/signup"
                secondaryLabel="Or use free YouTube captions"
                secondaryHref="#"
              />
            )}
          </>
        )}
        renderPlaylist={({ switchMode }) => (
          <>
            <PlaylistTab
              isAuthenticated={!!user}
              onAuthRequired={() => setShowPlaylistFriction(true)}
              onSwitchToAudio={() => switchMode("audio")}
            />
            {!user && showPlaylistFriction && (
              <FrictionConversionCard
                className="mt-6"
                headline="Get the full playlist"
                body={`Sign up free — ${WELCOME} credits included, no credit card needed. Extract any playlist, not just single videos. Credits never expire.`}
                primaryCtaLabel="Sign up free →"
                primaryCtaHref="/signup"
                secondaryLabel="Or extract a single video"
                secondaryHref="#"
              />
            )}
          </>
        )}
        renderAudio={() => (
          user ? (
            <AudioTab onTranscriptLoaded={handleTranscriptLoaded} />
          ) : (
            <FrictionConversionCard
              headline="File transcription"
              body={`Upload audio or video — MP3, MP4, MOV, MKV, WAV, M4A and more. AI transcription via AssemblyAI at ${PER_MIN} credit per minute. The file is deleted after transcription. Sign up free for ${WELCOME} credits — no credit card needed.`}
              primaryCtaLabel="Sign up free →"
              primaryCtaHref="/signup"
              secondaryLabel="Or paste a YouTube URL"
              secondaryHref="#"
            />
          )
        )}
      />

      {!user && <MicroTrustRow />}
    </div>
  )
}
