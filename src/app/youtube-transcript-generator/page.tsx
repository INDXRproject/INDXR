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

  // Shared logic with Dashboard (consider extracting to a hook later)
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

  const processVideo = async (videoId: string) => {
    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoIdOrUrl: videoId }),
        })
        
        const data = await response.json()
        
        if (!response.ok || data.success === false) {
            throw new Error(data.error || 'Failed to extract transcript')
        }

        // Auto-save if logged in
        if (user) {
            await handleTranscriptLoaded(data.transcript, { 
                source: 'youtube',
                videoId, 
                title: data.title, 
                videoUrl: data.video_url,
                duration: 0
            })
        }
        
    } catch (error) {
        console.error(`Process video ${videoId} failed:`, error)
        throw error
    }
  }

  return (
    <div className="container max-w-4xl py-24 px-4 mx-auto text-center">
      <h1 className="text-4xl font-bold text-foreground mb-6">YouTube Transcript Generator</h1>
      <p className="text-muted-foreground mb-10 text-lg max-w-2xl mx-auto">Extract accurate transcripts from YouTube videos and playlists. Export to TXT, JSON, CSV, SRT, VTT formats.</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8 mb-12">
        <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-muted/30 h-auto rounded-xl">
          <TabsTrigger 
            value="video" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <Video className="h-4 w-4" /> Single Video
          </TabsTrigger>
          <TabsTrigger 
            value="playlist" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <ListMusic className="h-4 w-4" /> Playlist
          </TabsTrigger>
          <TabsTrigger 
            value="audio" 
            className="rounded-lg py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 text-[var(--text-muted)] font-medium gap-2"
          >
            <Mic className="h-4 w-4" /> Audio Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video">
          <VideoTab 
             onPlaylistDetected={() => setActiveTab('playlist')} 
             onTranscriptLoaded={handleTranscriptLoaded}
          />
        </TabsContent>

        <TabsContent value="playlist">
          <PlaylistTab 
            isAuthenticated={!!user}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onExtractVideo={processVideo}
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
  )
}
