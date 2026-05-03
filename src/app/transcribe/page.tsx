"use client"

import { useEffect, useState } from "react"
import { Video, ListMusic, Mic } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthModal } from "@/components/AuthModal"
import { createClient } from "@/utils/supabase/client"
import { VideoTab } from "@/components/free-tool/VideoTab"
import { PlaylistTab } from "@/components/free-tool/PlaylistTab"
import { AudioTab } from "@/components/free-tool/AudioTab"
import { TranscriptItem } from "@/components/TranscriptCard"
import { TranscriptMetadata } from "@/types/transcript"
import { Footer } from "@/components/Footer"

export default function FreeToolPage() {
  const [activeTab, setActiveTab] = useState("video")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
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

        await supabase.from('transcripts').insert({
            user_id: (user as any).id,
            video_id: videoId,
            title: metadata.title || `Video ${videoId}`,
            transcript: transcript,
            duration: duration,
            character_count: characterCount,
            thumbnail_url: thumbnailUrl,
            is_favorite: false,
            source_type: metadata.source || 'youtube',
            filename: metadata.filename,
            credits_used: metadata.creditsUsed || 0,
            processing_method: metadata.processingMethod || 'youtube_captions'
        })
        toast.success("Saved to your Library")
     } catch (err) {
         console.error("Auto-save failed", err)
     }
  }

  return (
    <>
    <div className="container max-w-4xl py-24 px-4 mx-auto text-center">
      <h1 className="text-4xl font-bold text-fg mb-6">Free YouTube Transcript Generator</h1>
      <p className="text-fg-muted mb-10 text-lg max-w-2xl mx-auto">
        Extract YouTube transcripts instantly. Free for videos with captions. AI transcription for videos without. Export as TXT, Markdown, SRT, VTT, CSV, JSON, or RAG-ready. No extension needed.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8 mb-12">
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

        <TabsContent value="video">
          <VideoTab
             onPlaylistDetected={() => setActiveTab('playlist')}
             onTranscriptLoaded={handleTranscriptLoaded}
             onSwitchToAudio={() => setActiveTab('audio')}
          />
        </TabsContent>

        <TabsContent value="playlist">
          <PlaylistTab
            isAuthenticated={!!user}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onSwitchToAudio={() => setActiveTab('audio')}
          />
        </TabsContent>

        <TabsContent value="audio">
          <AudioTab onTranscriptLoaded={handleTranscriptLoaded} />
        </TabsContent>
      </Tabs>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false)
          toast.success("You can now extract playlists!")
        }}
      />
    </div>

    {/* Below-tool content: SEO article */}
    <div className="container max-w-3xl px-4 mx-auto pb-24 text-left">
      <div className="prose-content text-[var(--fg-subtle)] leading-relaxed">

        <p>
          Paste any YouTube URL. If the video has auto-generated captions, the transcript appears in
          seconds at no cost. If it doesn&apos;t, INDXR.AI tells you immediately and offers AI transcription
          so you&apos;re never left with an empty result or a cryptic error.
        </p>

        <h2>How It Works</h2>

        <p>
          <strong>Step 1:</strong> Paste any YouTube URL — standard <code>youtube.com/watch?v=</code>{" "}
          links, shortened <code>youtu.be/</code> links, and playlist URLs all work.
        </p>
        <p>
          <strong>Step 2:</strong> INDXR.AI checks whether auto-captions are available. If they are,
          the transcript extracts instantly. If not, you&apos;ll see the option to enable AI Transcription
          with the exact credit cost for that video&apos;s duration — before you confirm anything.
        </p>
        <p>
          <strong>Step 3:</strong> The transcript appears in full. Read it, search it, copy specific
          sections, or export in one of eight formats.
        </p>
        <p>
          <strong>Step 4:</strong> If you have an account, the transcript is saved to your library.
          Re-export in a different format next month, generate an AI summary, or edit the text directly.
        </p>

        <h2>What Makes This Different from YouTube&apos;s Built-In Transcript</h2>

        <p>
          YouTube has a built-in &quot;Show transcript&quot; button. INDXR.AI does something meaningfully
          different:
        </p>

        <p>
          <strong>Videos without captions are covered.</strong> YouTube&apos;s transcript button only appears
          when captions exist. For the roughly 20% of videos without auto-captions, INDXR.AI offers AI
          transcription — YouTube doesn&apos;t.
        </p>

        <p>
          <strong>Export in formats that are actually useful.</strong> YouTube&apos;s transcript can only be
          copied as plain text with embedded timestamps. INDXR.AI exports as clean TXT, Markdown with
          YAML frontmatter, properly-timed SRT and VTT, CSV, JSON, and RAG-optimized JSON.
        </p>

        <p>
          <strong>SRT timing is resegmented.</strong> YouTube&apos;s subtitle timing creates 2–4 second
          blocks — too fast for comfortable reading in a video editor. INDXR.AI resegments to
          broadcast-standard 3–7 second blocks before export.
        </p>

        <p>
          <strong>It works without a browser extension.</strong> Works on any browser, any device,
          without installing anything.
        </p>

        <h2>Export Formats</h2>

        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>TXT — Plain</strong></td><td>Copy-paste into ChatGPT, Claude, or any AI tool</td></tr>
            <tr><td><strong>TXT — With Timestamps</strong></td><td>Research notes, citing specific moments</td></tr>
            <tr><td><strong>Markdown — Plain</strong></td><td>Blog posts, newsletters, repurposing content</td></tr>
            <tr><td><strong>Markdown — With Timestamps</strong></td><td>Obsidian notes, Notion databases</td></tr>
            <tr><td><strong>SRT</strong></td><td>Premiere Pro, DaVinci Resolve, CapCut</td></tr>
            <tr><td><strong>VTT</strong></td><td>HTML5 video players, Canvas, Moodle, Articulate</td></tr>
            <tr><td><strong>CSV</strong></td><td>Data analysis, research, spreadsheet work</td></tr>
            <tr><td><strong>JSON</strong></td><td>Developer pipelines, data storage</td></tr>
            <tr><td><strong>JSON — RAG Optimized</strong></td><td>Vector databases, LangChain, LlamaIndex, Pinecone</td></tr>
          </tbody>
        </table>

        <p>
          All export formats are available to registered users. Anonymous users can download TXT. A free
          account with 25 welcome credits unlocks everything.
        </p>

        <h2>For Videos Without Captions</h2>

        <p>
          If a video has no auto-captions, INDXR.AI uses AI transcription to generate a transcript from
          the audio directly. Enable the AI Transcription toggle before extracting. The cost is shown
          upfront: 1 credit per minute of video. A 30-minute video costs 30 credits (approximately €0.36
          at Plus pricing). The resulting transcript has proper punctuation and capitalization — something
          auto-captions lack.
        </p>

        <h2>For Playlists</h2>

        <p>
          The Playlist tab accepts any YouTube playlist URL and extracts transcripts from all selected
          videos in a single job. First three auto-caption videos are free, then 1 credit per video. AI
          Transcription costs apply per video where enabled.
        </p>

        <h2>Frequently Asked Questions</h2>

        <p><strong>Is this actually free?</strong><br />
        For single videos with auto-captions: yes, completely free, no account required. Download as TXT
        with no daily limit for registered users. For advanced export formats, create a free account. For
        AI transcription and playlist processing, credits are used — 1 credit per minute for AI
        transcription. A free account includes 25 credits on signup.</p>

        <p><strong>Does it work without a Chrome extension?</strong><br />
        Yes. INDXR.AI is a web tool — nothing to install. Works in Chrome, Firefox, Safari, Edge, and
        mobile browsers.</p>

        <p><strong>What happens if the video has no transcript?</strong><br />
        INDXR.AI detects this upfront and shows you the option to enable AI Transcription, along with
        the exact credit cost for that video&apos;s length. You decide before any credits are spent.</p>

        <p><strong>How long does extraction take?</strong><br />
        For auto-caption videos: typically 2–5 seconds. For AI Transcription: approximately 1 minute
        per 10 minutes of video. Progress is shown in real time.</p>

        <p><strong>Can I use this for non-English videos?</strong><br />
        Yes. Auto-caption extraction works for any language YouTube supports (67 languages). AI
        Transcription via AssemblyAI Universal-3 Pro supports 99+ languages with automatic detection.</p>

        <p><strong>What is RAG JSON and do I need it?</strong><br />
        RAG (Retrieval-Augmented Generation) JSON is a specialized export for developers building AI
        search systems. If you&apos;re not building a vector database or LangChain pipeline, you don&apos;t need
        it. Standard JSON, Markdown, SRT, and TXT cover most use cases.</p>

      </div>
    </div>
    <Footer />
    </>
  )
}
