"use client"

import { useState } from "react"
import { PricingCard } from "@/components/ui/pricing-card"
import { Footer } from "@/components/Footer"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Gift, Clock, CreditCard } from "lucide-react"

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handlePurchase = async (plan: string) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        toast.error("Please log in to purchase credits")
        router.push('/login?next=/pricing')
        return
    }

    try {
      setLoadingPlan(plan)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to create checkout session')
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      const msg = error instanceof Error ? error.message : "An error occurred during checkout."
      toast.error(msg)
      setLoadingPlan(null)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container py-24 px-4 sm:px-6 lg:px-8 mx-auto">

        {/* Header */}
        <div className="text-center mb-12 max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fg)]">
            Pay once. Use when you need it.
          </h1>
          <p className="text-xl text-[var(--fg-muted)] max-w-2xl mx-auto">
            Auto-caption extraction is always free. Credits apply only when you use AI transcription, playlist processing beyond the first three videos, AI summaries, or RAG JSON export.
          </p>
        </div>

        {/* Callout badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-primary/20">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Credits never expire — use them at your own pace</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
            <Gift className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">25 free credits when you sign up</span>
          </div>
        </div>

        {/* Always free callout */}
        <div className="max-w-2xl mx-auto mb-10 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
          <p className="text-sm text-[var(--fg-subtle)]">
            <strong className="text-[var(--fg)]">Always free:</strong> single video auto-caption extraction (unlimited for registered users), all export formats, 25 welcome credits on signup.
          </p>
        </div>

        {/* Pricing cards grid - 3 primary tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">

          <PricingCard
            name="Basic"
            price="€6.99"
            credits={500}
            description="Occasional use, testing AI transcription, processing a short course."
            ctaLabel={loadingPlan === 'basic' ? 'Redirecting...' : 'Buy Basic'}
            features={[
              "500 credits — €0.014/credit",
              "~8h AI transcription",
              "or 500 playlist videos",
              "All export formats",
            ]}
            onSelect={() => handlePurchase('basic')}
          />

          <PricingCard
            name="Plus"
            price="€13.99"
            credits={1200}
            label="Most Popular"
            featured={true}
            description="Regular use, researchers, content creators, developers."
            ctaLabel={loadingPlan === 'plus' ? 'Redirecting...' : 'Buy Plus'}
            features={[
              "1,200 credits — €0.012/credit",
              "~20h AI transcription",
              "or 1,200 playlist videos",
              "All export formats",
            ]}
            onSelect={() => handlePurchase('plus')}
          />

          <PricingCard
            name="Pro"
            price="€27.99"
            credits={2800}
            description="Heavy use, large corpus projects, agencies."
            ctaLabel={loadingPlan === 'pro' ? 'Redirecting...' : 'Buy Pro'}
            features={[
              "2,800 credits — €0.010/credit",
              "~46h AI transcription",
              "or 2,800 playlist videos",
              "All export formats",
            ]}
            onSelect={() => handlePurchase('pro')}
          />
        </div>

        {/* Quiet tiers */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-[var(--fg-muted)]">
          <span>
            Need fewer?{" "}
            <button
              onClick={() => handlePurchase('try')}
              className="text-[var(--accent)] hover:underline cursor-pointer"
            >
              Starter — €2.99 / 150 credits
            </button>
          </span>
          <span className="hidden sm:inline text-[var(--border)]">|</span>
          <span>
            Processing larger volumes?{" "}
            <button
              onClick={() => handlePurchase('power')}
              className="text-[var(--accent)] hover:underline cursor-pointer"
            >
              Power — €54.99 / 6,000 credits
            </button>
          </span>
        </div>

        {/* Cost table */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-6 text-center">What does it actually cost?</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 pr-4 font-semibold text-[var(--fg)]">Task</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--fg)]">Credits</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--fg)]">Basic</th>
                  <th className="text-right py-3 pl-4 font-semibold text-[var(--fg)]">Plus</th>
                </tr>
              </thead>
              <tbody className="text-[var(--fg-subtle)]">
                {[
                  ["Single video, auto-captions", "0", "Free", "Free"],
                  ["AI Transcription, 30 min", "30", "€0.42", "€0.36"],
                  ["AI Transcription, 1 hour", "60", "€0.84", "€0.72"],
                  ["Playlist, 20 videos (auto-captions)", "17", "€0.24", "€0.20"],
                  ["AI Summary", "3", "€0.04", "€0.04"],
                  ["RAG JSON export, 1-hour video", "4", "€0.06", "€0.05"],
                  ["1-hour AI Transcription + RAG JSON", "64", "€0.90", "€0.77"],
                ].map(([task, credits, basic, plus]) => (
                  <tr key={task} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 pr-4">{task}</td>
                    <td className="text-right py-3 px-4 tabular-nums">{credits}</td>
                    <td className="text-right py-3 px-4 tabular-nums">{basic}</td>
                    <td className="text-right py-3 pl-4 tabular-nums">{plus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitor comparison */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-6 text-center">How we compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 pr-4 font-semibold text-[var(--fg)]">Tool</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--fg)]">AI Transcription / min</th>
                  <th className="text-right py-3 pl-4 font-semibold text-[var(--fg)]">Model</th>
                </tr>
              </thead>
              <tbody className="text-[var(--fg-subtle)]">
                {[
                  ["Rev.com", "~$0.25/min ($15/hr)", "Pay-per-use"],
                  ["HappyScribe", "~€0.20/min (€12/hr)", "Per-minute"],
                  ["TurboScribe", "~$0.013/min at $10/mo", "Subscription"],
                  ["Otter.ai", "~$0.014/min at $10/mo", "Subscription"],
                  ["INDXR.AI Basic", "€0.014/min", "Credits, no expiry"],
                  ["INDXR.AI Plus", "€0.012/min", "Credits, no expiry"],
                ].map(([tool, price, model], i) => (
                  <tr key={tool} className={`border-b border-[var(--border)] last:border-0 ${i >= 4 ? "font-medium text-[var(--fg)]" : ""}`}>
                    <td className="py-3 pr-4">{tool}</td>
                    <td className="text-right py-3 px-4 tabular-nums">{price}</td>
                    <td className="text-right py-3 pl-4">{model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            INDXR.AI&apos;s AI transcription costs are comparable to the cheapest subscription tools — without requiring a monthly commitment. Auto-caption extraction, which covers the majority of YouTube videos, is always free.
          </p>
        </div>

        {/* How credits work */}
        <div className="mt-12 max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
          {[
            { icon: CreditCard, heading: "One-time purchase", body: "No subscription, no automatic renewal. Buy when you need to." },
            { icon: Clock, heading: "Credits never expire", body: "Buy in April, use in October. Or next year. They'll be there." },
            { icon: Gift, heading: "25 free credits on signup", body: "No credit card required. Enough for a 25-minute AI transcription or 8 AI summaries." },
          ].map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex gap-4">
              <Icon className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-[var(--fg)] mb-1">{heading}</p>
                <p className="text-sm text-[var(--fg-muted)]">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ section */}
        <div className="mt-24 max-w-3xl mx-auto border-t pt-16 border-[var(--border)]">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--fg)]">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-6">
            {[
              {
                q: "Do credits expire?",
                a: "Never. Buy when you want, use when you're ready. There's no time limit."
              },
              {
                q: "Do I need an account to get started?",
                a: "No. Extracting a single video with auto-captions is free without an account — paste a URL, download as TXT. A free account removes the daily rate limit, unlocks all export formats, and gives you 25 welcome credits to test AI transcription and other paid features."
              },
              {
                q: "What happens when I run out of credits?",
                a: "You can always purchase a new package. Your library and all previously extracted transcripts remain available — nothing is deleted when your credit balance reaches zero."
              },
              {
                q: "What if I need fewer credits than Basic?",
                a: "The Starter (€2.99 / 150 credits) is available for a single project or a quick test. It's accessible via the link below the three main plans."
              },
              {
                q: "Does INDXR.AI work for audio files, not just YouTube?",
                a: "Yes. Audio Upload accepts MP3, MP4, WAV, M4A, OGG, FLAC, and WEBM files up to 500MB. Same AI transcription pipeline, same credit cost (1 credit per minute), same export options."
              },
              {
                q: "Is RAG JSON export included in the standard price?",
                a: "RAG JSON export costs 1 credit per 15 minutes of video (minimum 1 credit) on top of extraction costs. The first 3 RAG exports are free — enough to validate the format in your pipeline before spending credits."
              },
              {
                q: "Can I get a refund?",
                a: "We offer refunds within 7 days if you haven't used more than 5 credits."
              },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-2">
                <h3 className="font-semibold text-lg text-[var(--fg)]">{q}</h3>
                <p className="text-[var(--fg-muted)]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}
