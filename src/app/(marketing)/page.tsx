import Link from "next/link"
import { ArrowRight, Zap, AudioWaveform, ListVideo, Library } from "lucide-react"
import { FeatureCard } from "@/components/FeatureCard"
import { Footer } from "@/components/Footer"
import { HeroImage } from "@/components/HeroImage"

export default function LandingPage() {
  return (
    <>
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full min-h-screen flex flex-col items-center border-b border-[var(--border)] relative overflow-hidden bg-[var(--bg-base)] pt-[150px]">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.08)_0%,transparent_70%),var(--bg-base)] pointer-events-none"></div>
        <HeroImage />
        <div className="container px-4 text-center relative z-10 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-[800] tracking-[-0.03em] mb-6 max-w-4xl leading-[1.1] text-[var(--text-primary)]">
            Extract. Export. Index. Every video.
          </h1>
          <p className="text-lg sm:text-xl max-w-[720px] mx-auto mb-10 leading-relaxed text-[var(--text-secondary)]">
            YouTube videos, playlists, and audio files — transcribed and processed to suit all your needs. Export as TXT, Markdown, SRT, JSON, or RAG-optimized format. Neatly organized in your library.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/youtube-transcript-generator" className="w-full sm:w-auto">
              <button className="
                px-8 py-3 rounded-lg font-semibold text-base
                bg-[var(--accent)] text-white
                hover:bg-[var(--accent-hover)]
                active:scale-[0.97]
                transition-all duration-150 ease-out
                cursor-pointer
                h-12 w-full sm:w-auto
              ">
                Start Transcribing <ArrowRight className="ml-2 h-4 w-4 inline" />
              </button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="px-8 py-3 rounded-lg font-medium text-base bg-transparent border border-current text-[var(--text-primary)] dark:text-white dark:border-white/60 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-150 ease-out cursor-pointer h-12 w-full sm:w-auto">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-black/40 dark:text-white/60 z-10 px-4">
          No account needed — free for captioned videos. Sign up for credits, exports &amp; library access.
        </p>
      </section>

      {/* Features Grid */}
      <section className="w-full py-16 sm:py-24 flex justify-center border-b border-[var(--border)] bg-[var(--bg-base)]">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <FeatureCard
              icon={Zap}
              title="Paste a URL, get a transcript in seconds"
              description="Auto-captions extracted instantly — free, no account needed. We tell you upfront whether captions are available and exactly what AI transcription will cost before you confirm."
            />
            <FeatureCard
              icon={ListVideo}
              title="Extract entire playlists in one job"
              description="Paste a playlist URL. We scan every video for caption availability. First three auto-caption videos free. Select, confirm the total cost, and the job runs on our servers."
            />
            <FeatureCard
              icon={AudioWaveform}
              title="No YouTube URL? Upload the file"
              description="Podcast episode, recorded lecture, interview — drag and drop any audio or video file up to 500MB. Same AI transcription pipeline, same export options."
            />
            <FeatureCard
              icon={Library}
              title="Eight formats. One library."
              description="Every transcript exports as TXT, Markdown with YAML frontmatter, SRT, VTT, CSV, JSON, or RAG-optimized JSON. Saved to your searchable library — re-export in a different format months later."
            />
          </div>
        </div>
      </section>

      {/* Who uses INDXR Section */}
      <section className="w-full py-16 sm:py-24 flex justify-center border-b border-[var(--border)] bg-[var(--bg-base)]">
        <div className="container px-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12 text-[var(--text-primary)]">
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
      <section className="w-full py-16 sm:py-24 flex justify-center border-b border-[var(--border)] bg-[var(--bg-base)]">
        <div className="container px-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12 text-[var(--text-primary)]">
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
      <section className="w-full py-16 sm:py-24 flex justify-center bg-[var(--bg-base)]">
        <div className="container px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-6 text-[var(--text-primary)]">
            Start with any YouTube video. It&apos;s free.
          </h2>
          <p className="text-lg sm:text-xl max-w-[640px] mx-auto mb-10 leading-relaxed text-[var(--text-secondary)]">
            Auto-caption videos are always free. No account required.
            When you&apos;re ready for playlists, AI transcription, and your
            personal library — credits never expire.
          </p>
          <Link href="/youtube-transcript-generator" className="inline-block">
            <button className="
              px-8 py-3 rounded-lg font-semibold text-base
              bg-[var(--accent)] text-white
              hover:bg-[var(--accent-hover)]
              active:scale-[0.97]
              transition-all duration-150 ease-out
              cursor-pointer
              h-12
            ">
              Try INDXR free →
            </button>
          </Link>
        </div>
      </section>
    </div>
    <Footer />
    </>
  )
}

function PersonaCard({ emoji, label, body }: { emoji: string; label: string; body: string }) {
  return (
    <div className="p-6 rounded-xl border bg-[var(--bg-surface)] border-[var(--border)]">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">{label}</h3>
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
    </div>
  )
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="
      p-8 rounded-xl border-l-2 border-[var(--accent)]
      bg-[var(--bg-surface)] border border-[var(--border)]
      border-l-[var(--accent)] flex flex-col h-full
    ">
      <p className="text-[15px] italic leading-relaxed text-[var(--text-secondary)] mb-6 flex-grow">
        "{quote}"
      </p>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{name}</div>
        <div className="text-xs text-[var(--text-muted)]">{role}</div>
      </div>
    </div>
  )
}

