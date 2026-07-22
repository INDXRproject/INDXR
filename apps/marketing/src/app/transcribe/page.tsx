"use client"

import { useEffect, useState } from "react"
import { Video, ListMusic, Mic } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@indxr/shared/components/ui/tabs"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { VideoTab } from "@indxr/shared/components/free-tool/VideoTab"
import { PlaylistTab } from "@indxr/shared/components/free-tool/PlaylistTab"
import { AudioTab } from "@indxr/shared/components/free-tool/AudioTab"
import { TranscriptItem } from "@indxr/shared/components/TranscriptCard"
import { TranscriptMetadata } from "@indxr/shared/types/transcript"
import { MicroTrustRow } from "@/components/marketing/MicroTrustRow"
import { FrictionConversionCard } from "@/components/marketing/FrictionConversionCard"
import { PricingTeaserBlock } from "@/components/marketing/PricingTeaserBlock"
import { FAQAccordion, FAQItem } from "@/components/marketing/FAQAccordion"
import { ClosingCTASection } from "@/components/marketing/ClosingCTASection"
import { transcriptionModelName } from "@indxr/shared/lib/models"

const faqItems: FAQItem[] = [
  {
    question: "What's the difference between auto-captions and AI transcription?",
    answer: "[placeholder — Khidr writes: auto-captions are extracted from YouTube's subtitle track (free, instant). AI transcription uses AssemblyAI to generate a transcript from the audio when no captions exist (1 credit/minute).]",
  },
  {
    question: "Why would I sign up if the tool is free?",
    answer: "[placeholder — Khidr writes: free tier covers single videos with auto-captions. Signing up gives you 25 credits (no card needed), playlists, AI transcription, non-TXT export formats, and your personal library.]",
  },
  {
    question: "What if my video doesn't have captions?",
    answer: "[placeholder — Khidr writes: INDXR detects this upfront and offers AI transcription. You see the exact credit cost before confirming. No surprise charges.]",
  },
  {
    question: "Can I extract a full playlist without an account?",
    answer: "[placeholder — Khidr writes: playlist extraction requires a free account. Signing up is free and includes 25 credits. No credit card needed.]",
  },
  {
    question: "What languages are supported?",
    answer: `[placeholder — Khidr writes: auto-caption extraction supports 67 languages (any YouTube supports). For AI transcription, INDXR automatically uses the best model for the language — our highest-quality model, ${transcriptionModelName()}, for supported languages, with broad coverage across 99+ languages and automatic detection. See /docs/how-indxr-works/accuracy.]`,
  },
  {
    question: "What export formats can I get?",
    answer: "[placeholder — Khidr writes: TXT (free, no account), Markdown, CSV, SRT, VTT, JSON, RAG-optimized JSON (all require free account). See /docs/how-indxr-works/export-formats.]",
  },
]

export default function FreeToolPage() {
  const [activeTab, setActiveTab] = useState("video")
  const [showPlaylistFriction, setShowPlaylistFriction] = useState(false)
  const [user, setUser] = useState<unknown>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) setShowPlaylistFriction(false)
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

      await supabase.from("transcripts").insert({
        user_id: (user as { id: string }).id,
        video_id: videoId,
        title: metadata.title || `Video ${videoId}`,
        transcript: transcript,
        duration: duration,
        character_count: characterCount,
        thumbnail_url: thumbnailUrl,
        is_favorite: false,
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
          Free YouTube Transcript Generator
        </h1>
        <p className="text-[var(--fg-muted)] mb-10 text-lg max-w-2xl mx-auto">
          Extract YouTube transcripts instantly. Free for videos with captions. AI transcription for videos without. Export as TXT, Markdown, SRT, VTT, CSV, JSON, or RAG-ready. No extension needed.
        </p>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v)
            if (v !== "playlist") setShowPlaylistFriction(false)
          }}
          className="w-full space-y-8 mb-6"
        >
          <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-surface-elevated/30 h-auto rounded-xl">
            <TabsTrigger
              value="video"
              className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-fg-on-accent data-[state=active]:shadow-sm transition-all duration-200 text-[var(--fg-muted)] font-medium gap-2"
            >
              <Video className="h-4 w-4" /> Single Video
            </TabsTrigger>
            <TabsTrigger
              value="playlist"
              className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-fg-on-accent data-[state=active]:shadow-sm transition-all duration-200 text-[var(--fg-muted)] font-medium gap-2"
            >
              <ListMusic className="h-4 w-4" /> Playlist
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-fg-on-accent data-[state=active]:shadow-sm transition-all duration-200 text-[var(--fg-muted)] font-medium gap-2"
            >
              <Mic className="h-4 w-4" /> Audio Upload
            </TabsTrigger>
          </TabsList>

          {/* Single video — always works */}
          <TabsContent value="video">
            <VideoTab
              onPlaylistDetected={() => setActiveTab("playlist")}
              onTranscriptLoaded={handleTranscriptLoaded}
              onSwitchToAudio={() => setActiveTab("audio")}
            />
          </TabsContent>

          {/* Playlist — auth-aware; anonymous sees friction card on extraction attempt */}
          <TabsContent value="playlist">
            <PlaylistTab
              isAuthenticated={!!user}
              onAuthRequired={() => setShowPlaylistFriction(true)}
              onSwitchToAudio={() => setActiveTab("audio")}
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
          </TabsContent>

          {/* Audio — anonymous sees friction card immediately */}
          <TabsContent value="audio">
            {user ? (
              <AudioTab onTranscriptLoaded={handleTranscriptLoaded} />
            ) : (
              <FrictionConversionCard
                headline="Audio file transcription"
                body="Upload MP3, WAV, M4A, or other audio. AI transcription via AssemblyAI — 99.4% accuracy on benchmark data. 1 credit per minute. Audio is deleted after transcription. Sign up free for 25 credits — no credit card needed."
                primaryCtaLabel="Sign up free →"
                primaryCtaHref="/signup"
                secondaryLabel="Or paste a YouTube URL"
                secondaryHref="#"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Trust signals */}
        <MicroTrustRow />
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
