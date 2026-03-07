import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, AudioWaveform, ListVideo, Library } from "lucide-react"
import { FeatureCard } from "@/components/FeatureCard"

import { HeroUIPreview } from "@/components/HeroUIPreview"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 sm:py-24 lg:py-32 bg-background flex justify-center border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none"></div>
        <div className="container px-4 text-center relative z-10 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground mb-6 max-w-4xl leading-[1.1]">
            Every word. Every video. Yours.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-[720px] mx-auto mb-10 leading-relaxed">
            Extract transcripts from any YouTube video, playlist, 
            or audio file — with AI fallback when captions don&apos;t exist or 
            get blocked. No browser extension. No meeting bot. Just text.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/youtube-transcript-generator" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                Get Free Transcript <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto bg-transparent border-border hover:bg-muted hover:text-foreground transition-all">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No account needed for basic use.
          </p>

          <HeroUIPreview />
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-16 sm:py-24 bg-background flex justify-center border-b border-border">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <FeatureCard 
              icon={Zap}
              title="Instant extraction"
              description="YouTube captions retrieved in seconds. No queues, no waiting — paste a URL, get text."
            />
            <FeatureCard 
              icon={AudioWaveform}
              title="AI fallback, always"
              description="No captions? YouTube blocking access? Whisper AI transcribes directly from the audio. You never hit a dead end."
            />
            <FeatureCard 
              icon={ListVideo}
              title="Playlists & audio upload"
              description="Extract an entire course or playlist at once. Or upload your own audio file — interviews, recordings, voice memos."
            />
            <FeatureCard 
              icon={Library}
              title="Your personal library"
              description="Every transcript saved, searchable, and editable. Organised in collections. Export as TXT, JSON, or copy directly."
            />
          </div>
        </div>
      </section>

      {/* Who uses INDXR Section */}
      <section className="w-full py-16 sm:py-24 bg-background flex justify-center border-b border-border">
        <div className="container px-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12">
            Built for people who take content seriously.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 sm:grid-cols-2 gap-6">
            <PersonaCard 
              emoji="🎓"
              label="Students"
              body="Turn lecture playlists into study notes. Feed to AI, get a summary. Under 10 minutes."
            />
            <PersonaCard 
              emoji="🎙️"
              label="Researchers & Journalists"
              body="Transcribe interviews and source material. Search and quote precisely — no rewinding."
            />
            <PersonaCard 
              emoji="📚"
              label="Lifelong learners"
              body="Taking an online course? Extract, summarise with AI, export your notes. Actually remember what you watched."
            />
            <PersonaCard 
              emoji="🎬"
              label="Content Creators"
              body="Generate accurate captions with Whisper AI. Export as SRT, upload to YouTube Studio. Better captions, better SEO."
            />
            <PersonaCard 
              emoji="🔍"
              label="Professionals"
              body="Extract insights from webinars, competitor videos, earnings calls. Ctrl+F through hours of content."
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16 sm:py-24 bg-background flex justify-center border-b border-border">
        <div className="container px-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12">
            Trusted by researchers, creators, and students.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="I used to spend 20 minutes scrubbing through lectures for one quote. Now I paste the URL and Ctrl+F."
              name="M. van der Berg"
              role="PhD Researcher"
            />
            <TestimonialCard 
              quote="The Whisper fallback is the killer feature. Half the interviews I need to transcribe have no captions."
              name="S. Okafor"
              role="Investigative Journalist"
            />
            <TestimonialCard 
              quote="I run a YouTube channel and I export every video as SRT straight from INDXR. Saves me at least 2 hours a week."
              name="T. Lindqvist"
              role="Content Creator, 45k subs"
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="w-full py-16 sm:py-24 bg-background flex justify-center">
        <div className="container px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-6">
            Start free. No credit card.
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-[640px] mx-auto mb-10 leading-relaxed">
            Casual users never need an account. When you're ready 
            for playlists, Whisper AI, and your personal library — 
            credits start at €4.99.
          </p>
          <Link href="/youtube-transcript-generator">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              Try INDXR free →
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function PersonaCard({ emoji, label, body }: { emoji: string; label: string; body: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-lg font-bold mb-2 text-foreground">{label}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="p-8 rounded-2xl bg-card border border-border flex flex-col h-full">
      <p className="text-lg text-foreground italic mb-6 flex-grow">&quot;{quote}&quot;</p>
      <div>
        <div className="font-bold text-foreground">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
      </div>
    </div>
  )
}

