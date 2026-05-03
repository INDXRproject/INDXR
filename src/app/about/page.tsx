import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "About INDXR.AI — YouTube Transcript Tool",
  description: "INDXR.AI is a YouTube transcript extraction tool. Extract captions instantly, transcribe audio with AI, and export to any format.",
}

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    description: "YouTube transcript extraction — free caption extraction, AI transcription, and multi-format export.",
  },
]

export default function AboutPage() {
  return (
    <>
      <JsonLd schemas={schemas} />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fg)] mb-6">
          About INDXR.AI
        </h1>

        <section className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-6">
          <p>
            {/* [KHIDR: vul aan — kort verhaal achter INDXR.AI, waarom gebouwd, voor wie] */}
            INDXR.AI is a YouTube transcript extraction tool. It extracts captions from YouTube videos and playlists, transcribes audio with AI when captions aren't available, and exports transcripts in multiple formats.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">What we do</h2>
          <p>
            {/* [KHIDR: vul aan — product beschrijving, key features] */}
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Who builds INDXR.AI</h2>
          <p>
            {/* [KHIDR: vul aan — team/founder info] */}
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Contact</h2>
          <p>
            Questions? Use our <a href="/contact" className="text-[var(--accent)] hover:underline">contact form</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
