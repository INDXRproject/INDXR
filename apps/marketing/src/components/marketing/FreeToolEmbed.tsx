"use client"

// The live free tool, extracted so both /transcribe and the landing page embed the SAME workbench
// (no duplication). Self-contained: handles auth state, auto-save on transcript load, the library-full
// guard, and the sign-up friction cards for the paid paths. All credit/limit numbers render from the
// pricing/limits source. Renders MicroTrustRow for anonymous visitors.

import { useEffect, useState } from "react"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { TranscribeWorkbench } from "@indxr/shared/components/transcribe/TranscribeWorkbench"
import { VideoTab } from "@indxr/shared/components/free-tool/VideoTab"
import { TranscriptItem } from "@indxr/shared/components/TranscriptCard"
import { TranscriptMetadata } from "@indxr/shared/types/transcript"
import { MicroTrustRow } from "@indxr/shared/components/MicroTrustRow"
import { FrictionConversionCard } from "@indxr/shared/components/FrictionConversionCard"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

const WELCOME = FREE_TIER.WELCOME_CREDITS
const PER_MIN = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export function FreeToolEmbed() {
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
      if (session?.user) { setShowVideoAiFriction(false) }
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
          // Gate on tab activation — no network call. Playlist extraction has no route in the marketing
          // app (/api/playlist/info lives only in the app), so mounting PlaylistTab here 404'd and
          // surfaced a raw SyntaxError to anonymous Ads traffic. Anonymous → sign-up friction; logged-in
          // → hand off to the app (playlists run there). The deferred "first 3 free" FOMO preview is not
          // built yet, so we do not preview here. (ADR-079/080 follow-up.)
          user ? (
            <FrictionConversionCard
              headline="Playlists open in the app"
              body="Playlist transcription runs in your INDXR workspace — open the app to paste a playlist and pick your videos."
              primaryCtaLabel="Open the app →"
              primaryCtaHref={appHref("/transcribe?mode=playlist")}
            />
          ) : (
            <FrictionConversionCard
              headline="Playlist transcription"
              body={`Transcribe a whole YouTube playlist in one go. The first 3 videos are free — after that it's 1 credit per video for captions, or ${PER_MIN} credit per minute for AI transcription. Sign up free for ${WELCOME} credits — no credit card needed.`}
              primaryCtaLabel="Sign up free →"
              primaryCtaHref="/signup"
              secondaryLabel="Or paste a single YouTube URL"
              secondaryOnClick={() => switchMode("video")}
            />
          )
        )}
        renderAudio={({ switchMode }) => (
          // Gate on tab activation. Upload has no route in the marketing app (/api/transcribe/preflight
          // lives only in the app). Anonymous → sign-up friction (unchanged, verified). Logged-in → hand
          // off to the app; a File object can't cross the origin boundary, so we send them before they
          // pick a file, not after.
          user ? (
            <FrictionConversionCard
              headline="Uploads open in the app"
              body="File uploads run in your INDXR workspace — open the app to upload audio or video and transcribe it."
              primaryCtaLabel="Open the app →"
              primaryCtaHref={appHref("/transcribe?mode=audio")}
            />
          ) : (
            <FrictionConversionCard
              headline="File transcription"
              body={`Upload audio or video — MP3, MP4, MOV, MKV, WAV, M4A and more. AI transcription via AssemblyAI at ${PER_MIN} credit per minute. The file is deleted after transcription. Sign up free for ${WELCOME} credits — no credit card needed.`}
              primaryCtaLabel="Sign up free →"
              primaryCtaHref="/signup"
              secondaryLabel="Or paste a YouTube URL"
              secondaryOnClick={() => switchMode("video")}
            />
          )
        )}
      />

      {!user && <MicroTrustRow />}
    </div>
  )
}
