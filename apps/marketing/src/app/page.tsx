import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { HeroImage } from "@/components/marketing/HeroImage"
import { HowItWorksBlock } from "@/components/marketing/HowItWorksBlock"
import { CodeSample } from "@/components/marketing/CodeSample"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { RemotionLoop } from "@/components/marketing/RemotionLoop"
import { DifferentiatorStrip } from "@/components/marketing/DifferentiatorStrip"
import { StatsFromTesting } from "@/components/marketing/StatsFromTesting"
import { PricingTeaserBlock } from "@/components/marketing/PricingTeaserBlock"
import { ClosingCTASection } from "@/components/marketing/ClosingCTASection"
import { RAG_CHUNK_DEFAULT } from "@indxr/shared/lib/pricing"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"
import { HOME_SAMPLE_MARKDOWN, HOME_SAMPLE_SRT, HOME_SAMPLE_RAG } from "@/lib/homeExportSamples"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function LandingPage() {
  return (
    <>
      {/* Section 2 — Hero */}
      <section className="w-full min-h-screen flex flex-col items-center border-b border-[var(--border)] relative overflow-hidden bg-[var(--bg)] pt-[80px] lg:pt-[130px] xl:pt-[150px] 2xl:pt-[180px]">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.08)_0%,transparent_70%),var(--bg)] pointer-events-none" />
        <HeroImage />
        <div className="container px-4 text-center relative z-10 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-[800] tracking-[-0.03em] mb-6 max-w-4xl leading-[1.1] text-[var(--fg)]">
            Extract. Export. Index. Every video.
          </h1>
          <p className="text-lg sm:text-xl max-w-[720px] mx-auto mb-10 leading-relaxed text-[var(--fg-subtle)]">
            YouTube videos, playlists, and audio files — transcribed and processed to suit all your needs. Export as {exportFormatsProse("or")}. Neatly organized in your library.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/transcribe" className="w-full sm:w-auto">
              <button className="px-8 py-3 rounded-lg font-semibold text-base bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer h-12 w-full sm:w-auto">
                Start Transcribing <ArrowRight className="ml-2 h-4 w-4 inline" />
              </button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="px-8 py-3 rounded-lg font-medium text-base bg-transparent border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface)] transition-all duration-150 ease-out cursor-pointer h-12 w-full sm:w-auto">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-[var(--fg-muted)] z-10 px-4">
          No account needed — free for captioned videos. Sign up for credits, exports &amp; library access.
        </p>
      </section>

      {/* Section 3 — How it works (5 blocks) */}
      <section className="w-full border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center pt-16 mb-2 text-[var(--fg)]">
            How it works
          </h2>
          <p className="text-center text-[var(--fg-muted)] mb-0 pb-4 text-sm">
            One input, any scale, and the output your work needs.
          </p>

          <HowItWorksBlock
            number={1}
            heading="Any video, any audio"
            description="Paste a single YouTube URL, a playlist link, or upload an audio file. INDXR handles all three input types from the same interface."
            mockup={<RemotionLoop />}
          />

          <HowItWorksBlock
            number={2}
            heading="From one video to a whole playlist"
            description="Pull one video's captions, queue an entire playlist — up to 500 videos in a single job — or upload hours of audio for AI transcription. The same tool at any scale."
            reversed
            mockup={
              <DocsFigure
                src="/docs/screenshots/playlist-review.png"
                alt="The playlist review screen: a playlist's videos listed with durations and free/paid badges, ready to extract, before any job starts."
                caption="Review a whole playlist before it runs — pick which videos to extract."
              />
            }
          />

          <HowItWorksBlock
            number={3}
            heading="Output: actually readable"
            description="Paragraphed plain text, timestamped segments, Markdown with YAML frontmatter for Obsidian or Notion, CSV for data work. Readable, not a raw caption dump."
            audience="Knowledge workers, researchers, journalists"
            mockup={<CodeSample filename="transcript.md" code={HOME_SAMPLE_MARKDOWN} />}
          />

          <HowItWorksBlock
            number={4}
            heading="Output: subtitles for creators"
            description="Export SRT and VTT subtitle files. Upload directly to YouTube Studio, embed in video players, or use for accessibility compliance."
            audience="Content creators"
            reversed
            mockup={<CodeSample filename="captions.srt" code={HOME_SAMPLE_SRT} />}
          />

          <HowItWorksBlock
            number={5}
            heading="Output: build with it"
            description={`RAG-optimized JSON with sentence-aligned chunks (${RAG_CHUNK_DEFAULT} seconds by default, adjustable), deep-linked timestamps, and metadata. Drop it into LangChain, LlamaIndex, or any vector database. No preprocessing needed.`}
            audience="Developers, RAG builders"
            mockup={<CodeSample filename="transcript.rag.json  ·  one chunk of 60" code={HOME_SAMPLE_RAG} />}
          />
        </div>
      </section>

      {/* Section 4 — Differentiators */}
      <DifferentiatorStrip />

      {/* Section 5 — Stats from testing */}
      <StatsFromTesting />

      {/* Section 6 — Pricing teaser */}
      <PricingTeaserBlock />

      {/* Section 7 — Closing CTA */}
      <ClosingCTASection />

    </>
  )
}
