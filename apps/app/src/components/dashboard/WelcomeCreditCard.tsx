'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import { Gift } from "lucide-react"
import { claimWelcomeRewardAction } from "@/app/actions/credits"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import { useState } from "react"
import { useAuth } from "@indxr/shared/hooks/useAuth"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

export function WelcomeCreditCard({ claimed }: { claimed: boolean | null }) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { refreshCredits } = useAuth()
  const [claimResult, setClaimResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (claimed === true || claimed === null) return null

  const handleClaim = async () => {
    setClaimResult(null)
    setIsClaiming(true)
    try {
      const result = await claimWelcomeRewardAction()
      if (result.error) {
        setClaimResult({ type: 'error', message: result.error })
      } else {
        await refreshCredits()
        setClaimResult({ type: 'success', message: '25 credits added to your account!' })
      }
    } catch {
      setClaimResult({ type: 'error', message: 'Failed to claim reward' })
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <Card className="bg-accent/10 border-primary/30 mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
           <Gift className="h-6 w-6 text-accent" />
           <CardTitle className="text-xl">Get Started with Free Credits</CardTitle>
        </div>
        <CardDescription>
          We want you to experience the power of Indxr.AI. Here are 25 free credits on the house.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3 text-sm">

           {/* Single Video */}
           <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-accent/20 text-accent p-1 rounded">📺</span> Single Video
              </h3>
              <ul className="space-y-1 text-fg-muted">
                <li className="flex items-center gap-2">
                  <span className="text-success">●</span> Captions: <b>Always Free</b>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-warning">●</span> AI Whisper: <b>1 Credit</b> / min
                  <span className="text-xs text-fg-muted block ml-6 leading-tight">(Fallback if no captions available)</span>
                </li>
              </ul>
           </div>

           {/* Playlist */}
           <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-accent/20 text-accent p-1 rounded">📑</span> Playlists
              </h3>
               <ul className="space-y-1 text-fg-muted">
                <li className="flex items-center gap-2">
                  <span className="text-success">●</span> First <b>3 videos</b> free per extraction
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-warning">●</span> After that: <b>1 Credit</b> per video
                </li>
              </ul>
           </div>

           {/* Audio */}
           <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-accent/20 text-accent p-1 rounded">🎙️</span> Audio Upload
              </h3>
               <ul className="space-y-1 text-fg-muted">
                <li className="flex items-center gap-2">
                  <span className="text-fg-muted">●</span> Powered by AI Transcription
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-warning">●</span> Rate: <b>1 Credit</b> / min
                </li>
              </ul>
           </div>

        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {claimResult && (
          <FeedbackCard
            variant={claimResult.type}
            message={claimResult.message}
            onDismiss={() => setClaimResult(null)}
            className="w-full"
          />
        )}
        <div className="flex gap-3 w-full">
          <Button
              onClick={handleClaim}
              disabled={isClaiming || claimResult?.type === 'success'}
              className="flex-1"
          >
            {isClaiming ? "Claiming..." : "Claim 25 Free Credits"}
          </Button>
          <Button
              variant="outline"
              className="flex-1"
              onClick={() => { window.location.href = marketingHref('/pricing') }}
          >
              Buy More Credits
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
