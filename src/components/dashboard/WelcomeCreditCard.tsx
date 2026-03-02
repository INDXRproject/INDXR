'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Zap } from "lucide-react"
import { claimWelcomeRewardAction } from "@/app/actions/credits"
import { toast } from "sonner"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"

interface CheckResult {
  claimed: boolean
}

export function WelcomeCreditCard({ claimed }: { claimed: boolean | null }) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { refreshCredits } = useAuth()
  const [isHidden, setIsHidden] = useState(false)

  // Sync state with prop
  // If claimed is null (loading), hide it.
  // If claimed is true, hide it.
  // If claimed is false, show it (unless user manually dismissed it? no manual dismiss implemented yet).
  
  if (claimed === null || claimed === true) {
      if (!isHidden) return null // Or return skeleton? null is fine for "pop in" effect
  }
  
  // Actually, if we return null here, mounting state is lost.
  // Better:
  if (claimed === true || claimed === null) {
      return null
  }
  
  if (isHidden) return null

  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      const result = await claimWelcomeRewardAction()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("5 Credits added to your account!")
        await refreshCredits()
        setIsHidden(true)
      }
    } catch (error) {
      toast.error("Failed to claim reward")
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
           <Gift className="h-6 w-6 text-purple-400" />
           <CardTitle className="text-xl text-white">Get Started with Free Credits</CardTitle>
        </div>
        <CardDescription className="text-zinc-300">
          We want you to experience the power of Indxr.AI. Here are 5 free credits on the house.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3 text-sm">
           
           {/* Single Video */}
           <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 p-1 rounded">📺</span> Single Video
              </h3>
              <ul className="space-y-1 text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">●</span> Captions: <b>Always Free</b>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">●</span> AI Whisper: <b>1 Credit</b> / 10 mins
                  <span className="text-xs text-zinc-500 block ml-6 leading-tight">(Fallback if no captions available)</span>
                </li>
              </ul>
           </div>

           {/* Playlist */}
           <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-400 p-1 rounded">📑</span> Playlists
              </h3>
               <ul className="space-y-1 text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">●</span> Quota: <b>50 Videos</b> / month Free
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">●</span> Extra: <b>1 Credit</b> = +10 Videos
                </li>
              </ul>
           </div>

           {/* Audio */}
           <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="bg-pink-500/20 text-pink-400 p-1 rounded">🎙️</span> Audio Upload
              </h3>
               <ul className="space-y-1 text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-zinc-500">●</span> Powered by Whisper AI
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">●</span> Rate: <b>1 Credit</b> / 10 mins
                </li>
              </ul>
           </div>

        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button 
            onClick={handleClaim} 
            disabled={isClaiming}
            className="flex-1 bg-white text-purple-950 hover:bg-zinc-200 font-semibold"
        >
          {isClaiming ? "Claiming..." : "Claim 5 Free Credits"}
        </Button>
        <Button 
            variant="outline"
            className="flex-1 border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white"
            onClick={() => window.location.href = '/pricing'}
        >
            Buy More Credits
        </Button>
      </CardFooter>
    </Card>
  )
}
