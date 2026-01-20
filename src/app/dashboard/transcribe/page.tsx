"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { Youtube } from "lucide-react"

export default function TranscribePage() {
  const [url, setUrl] = useState("")

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div>
         <h1 className="text-3xl font-bold text-white mb-2">Transcribe Video</h1>
         <p className="text-zinc-400">Extract captions from YouTube videos or playlists.</p>
       </div>

       <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
              <CardTitle className="text-white">YouTube URL</CardTitle>
              <CardDescription className="text-zinc-400">Paste the valid link to the video or playlist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex gap-2">
                <div className="relative flex-1">
                   <div className="absolute left-3 top-2.5 text-zinc-500">
                     <Youtube className="h-5 w-5" />
                   </div>
                   <Input 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      className="pl-10 bg-zinc-950 border-zinc-800 text-white"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                   />
                </div>
                <Button>Extract</Button>
             </div>
             <p className="text-xs text-zinc-500">Supports regular videos, Shorts, and Live (replayed).</p>
          </CardContent>
       </Card>
    </div>
  )
}
