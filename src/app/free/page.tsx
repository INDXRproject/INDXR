"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Search } from "lucide-react"

export default function FreeToolPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  
  const handleExtract = async () => {
    setLoading(true)
    // Simulate extraction
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="container max-w-3xl py-24 px-4 mx-auto text-center">
       <h1 className="text-4xl font-bold text-white mb-6">Free YouTube Transcript Extractor</h1>
       <p className="text-zinc-400 mb-10 text-lg">Paste a YouTube URL below to get the full transcript instantly.</p>
       
       <div className="flex gap-2 max-w-xl mx-auto mb-12">
          <div className="relative flex-1">
             <div className="absolute left-3 top-2.5 text-zinc-500">
               <Search className="h-5 w-5" />
             </div>
             <Input 
                placeholder="https://www.youtube.com/watch?v=..." 
                className="pl-10 h-12 bg-zinc-900/50 border-white/10 text-white"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
             />
          </div>
          <Button size="lg" className="h-12 px-6" onClick={handleExtract} disabled={loading}>
            {loading ? "Extracting..." : "Extract"}
          </Button>
       </div>
       
       <div className="p-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center text-zinc-500">
         <p>Transcript results will appear here</p>
       </div>
    </div>
  )
}
