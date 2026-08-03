"use client"

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
import { PricingTeaserBlock } from "@/components/marketing/PricingTeaserBlock"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { ClosingCTASection } from "@/components/marketing/ClosingCTASection"
import { transcriptionRouterPhrase } from "@indxr/shared/lib/models"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"

const faqItems: FAQItem[] = [
  {
    question: "What's the difference between YouTube captions and AI transcription?",
    answer: "YouTube captions come straight from the video's own subtitle track — free and instant. AI transcription uses AssemblyAI to generate a transcript from the audio when no captions exist, at 1 credit per minute.",
  },
  {
    question: "Why would I sign up if the tool is free?",
    answer: "The free tier covers single videos with YouTube captions. Signing up (free, no card) adds 25 credits, playlists, AI transcription, every export format beyond TXT, and your personal library.",
  },
  {
    question: "What if my video doesn't have captions?",
    answer: "INDXR detects this up front and offers AI transcription instead. You see the exact credit cost before confirming — no surprise charges.",
  },
  {
    question: "Can I extract a full playlist without an account?",
    answer: "Playlist extraction needs a free account. Signing up is free, includes 25 credits, and needs no credit card.",
  },
  {
    question: "What languages are supported?",
    answer: `YouTube caption extraction works for any language YouTube provides captions for. For AI transcription, ${transcriptionRouterPhrase()}.`,
  },
  {
    question: "What export formats can I get?",
    answer: "TXT is free and needs no account. Markdown, CSV, SRT, VTT, JSON, and RAG-optimized JSON are all available with a free account.",
  },
]

export default function FreeToolPage() {
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

      // Storage limit — block a NEW transcript when the library is full (free caption path; paid
      // paths are blocked server-side before reserve). No credits involved here.
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
    <>
      {/* Hero + tool */}
      <div className="container max-w-4xl py-24 px-4 mx-auto text-center">
        <h1 className="text-4xl font-bold text-[var(--fg)] mb-6">
          Free YouTube transcript generator
        </h1>
        <p className="text-[var(--fg-muted)] mb-10 text-lg max-w-2xl mx-auto">
          Extract YouTube transcripts instantly. Free for videos with captions. AI transcription for videos without. Export as {exportFormatsProse("or")}. No extension needed.
        </p>

        {storageFull && (
          <div className="mb-6 text-left rounded-xl border border-[var(--error)]/20 bg-[var(--error-subtle)] px-4 py-3 flex items-start justify-between gap-3">
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
                  className="mt-6 text-left"
                  headline="AI transcription needs a free account"
                  body="Sign up free — 25 credits included, no credit card needed. AI transcription runs at 1 credit per minute; YouTube captions stay free. Credits never expire."
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
                  className="mt-6 text-left"
                  headline="Get the full playlist"
                  body="Sign up free — 25 credits included, no credit card needed. Extract any playlist, not just single videos. Credits never expire."
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
                headline="Audio file transcription"
                body="Upload MP3, WAV, M4A, or other audio. AI transcription via AssemblyAI at 1 credit per minute. Audio is deleted after transcription. Sign up free for 25 credits — no credit card needed."
                primaryCtaLabel="Sign up free →"
                primaryCtaHref="/signup"
                secondaryLabel="Or paste a YouTube URL"
                secondaryHref="#"
              />
            )
          )}
        />

        {/* Idle state below the card: trust signals for anonymous visitors (the Recent list is
            gone, ADR-080). Logged-in idle is just the card + the docs link below. */}
        {!user && <MicroTrustRow />}

        {/* Quiet docs link under the card */}
        <p className="mt-6 text-sm text-[var(--fg-muted)]">
          <a href="/docs" className="hover:text-[var(--fg)] transition-colors">Learn how transcription works →</a>
        </p>
      </div>

      {/* Below-fold sections */}
      <PricingTeaserBlock />

      <div className="container max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-[var(--fg)] mb-6">Frequently asked questions</h2>
        <FAQAccordion items={faqItems} />
      </div>

      <ClosingCTASection
        headline="Ready for more than single videos?"
        oneLiner="Sign up free — 25 credits included, no credit card needed. Unlock playlists, AI transcription, and your library."
        primaryCtaLabel="Sign up free"
        primaryCtaHref="/signup"
        secondaryLabel="Or keep using the free tool above"
        secondaryHref="/transcribe"
      />

    </>
  )
}
