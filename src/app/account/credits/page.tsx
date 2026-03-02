"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Coins, Zap, ListVideo, Mic, CreditCard, Check } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function CreditsPage() {
  const router = useRouter()
  const { user, credits, quota, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/account/credits')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="container max-w-4xl py-24 px-4 mx-auto">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container max-w-4xl py-24 px-4 mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-foreground mb-2">Credits & Billing</h1>
        <p className="text-muted-foreground">Manage your credits and view usage</p>
      </div>

      {/* Current Balance */}
      <Card className="bg-card/50 border-border/50 text-foreground mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold text-foreground mb-2">
            {credits ?? 0} <span className="text-2xl text-muted-foreground">credits</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Playlist quota: {quota?.playlistQuotaRemaining ?? 50}/50 free videos this month
          </p>
          <p className="text-xs text-muted-foreground">
            Resets: {quota?.quotaResetsAt ? new Date(quota.quotaResetsAt).toLocaleDateString() : 'N/A'}
          </p>
        </CardContent>
      </Card>

      {/* How Credits Work */}
      <Card className="bg-card/50 border-border/50 text-foreground mb-6">
        <CardHeader>
          <CardTitle>How Credits Work</CardTitle>
          <CardDescription className="text-muted-foreground">
            Pay only for what you use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Whisper AI Transcription</h4>
              <p className="text-sm text-muted-foreground mb-2">
                For videos without auto-captions, we use AI to transcribe the audio.
              </p>
              <p className="text-sm font-medium text-foreground">
                1 credit = 10 minutes of audio
              </p>
              <p className="text-xs text-muted-foreground">
                Example: 56-minute video = 6 credits
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ListVideo className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Playlist Extraction</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Extract transcripts from entire YouTube playlists.
              </p>
              <p className="text-sm font-medium text-foreground">
                50 videos/month FREE, then 1 credit per 10 videos
              </p>
              <p className="text-xs text-muted-foreground">
                Example: 80-video playlist = 3 credits (first 50 free, next 30 = 3 credits)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Mic className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Custom Audio Upload</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Upload your own audio files for transcription.
              </p>
              <p className="text-sm font-medium text-foreground">
                1 credit = 10 minutes of audio
              </p>
              <p className="text-xs text-muted-foreground">
                Same pricing as Whisper AI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <Card className="bg-card/50 border-border/50 text-foreground mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy Credits
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose a package that fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Starter Package */}
            <div className="p-4 rounded-lg border border-border bg-muted/50">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground mb-1">Starter</h3>
                <div className="text-3xl font-bold text-foreground">100</div>
                <div className="text-sm text-muted-foreground">credits</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-foreground">€9.99</div>
                <div className="text-xs text-muted-foreground">€0.10 per credit</div>
              </div>
              <ul className="space-y-2 mb-4 text-sm">
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  ~16 hours of Whisper AI
                </li>
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  1000 playlist videos
                </li>
              </ul>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </div>

            {/* Pro Package */}
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-foreground text-xs font-bold px-3 py-1 rounded-full">
                BEST VALUE
              </div>
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground mb-1">Pro</h3>
                <div className="text-3xl font-bold text-foreground">500</div>
                <div className="text-sm text-muted-foreground">credits</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-foreground">€39.99</div>
                <div className="text-xs text-muted-foreground">€0.08 per credit</div>
              </div>
              <ul className="space-y-2 mb-4 text-sm">
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  ~83 hours of Whisper AI
                </li>
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  5000 playlist videos
                </li>
              </ul>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </div>

            {/* Enterprise Package */}
            <div className="p-4 rounded-lg border border-border bg-muted/50">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground mb-1">Enterprise</h3>
                <div className="text-3xl font-bold text-foreground">2000</div>
                <div className="text-sm text-muted-foreground">credits</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-foreground">€139.99</div>
                <div className="text-xs text-muted-foreground">€0.07 per credit</div>
              </div>
              <ul className="space-y-2 mb-4 text-sm">
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  ~333 hours of Whisper AI
                </li>
                <li className="flex items-center text-foreground">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  20,000 playlist videos
                </li>
              </ul>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Payment Methods (Coming Soon)</h4>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>💳 Credit Card</span>
              <span>•</span>
              <span>🍎 Apple Pay</span>
              <span>•</span>
              <span>🔵 Google Pay</span>
              <span>•</span>
              <span>🇳🇱 iDEAL</span>
              <span>•</span>
              <span>📄 Invoice</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Placeholder */}
      <Card className="bg-card/50 border-border/50 text-foreground">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription className="text-muted-foreground">
            View your credit purchases and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Your credit purchases and usage will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
