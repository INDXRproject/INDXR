import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
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
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@indxr.ai",
    },
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
            INDXR.AI turns YouTube videos into text you can work with — captions when
            they exist, AI transcription when they don&apos;t, and exports in the format
            your work needs. This page is about who runs it and how; for what the tool
            does, start on the <a href="/" className="text-[var(--accent)] hover:underline">homepage</a>.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Who builds INDXR.AI</h2>
          <p>
            I built INDXR.AI out of my own use. Captions aren&apos;t always good enough to actually learn
            from, and when you&apos;re working through lectures, interviews, or a whole playlist, you end
            up with transcripts scattered across tabs, half-finished notes, and one-off exports. I wanted
            an archive instead: one place to keep everything, with summaries and export formats built for
            linking into your own notes, and AI transcription for when the captions aren&apos;t accurate
            enough to trust.
          </p>
          <p>
            It&apos;s operated by Tiny Web Ventures, based in the Netherlands. Full company details are in
            our <a href="/terms" className="text-[var(--accent)] hover:underline">Terms</a>.
          </p>
          <p>
            I&apos;m genuinely curious how people use it and what would make it better.{" "}
            <a href="/contact" className="text-[var(--accent)] hover:underline">Send feedback</a>. I read
            all of it myself.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Where it runs</h2>
          <p>
            Your account, your saved transcripts, and the transcription itself all run
            on servers inside the EU: the database and authentication are hosted on
            Supabase in the EU, and AI transcription is processed within the EU without
            your audio being used to train anyone&apos;s models. Payments are handled by
            Stripe. Dutch law applies, and prices include VAT.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Contact</h2>
          <p>
            Questions? Use our <a href="/contact" className="text-[var(--accent)] hover:underline">contact form</a>,
            or email us directly at{" "}
            <a href="mailto:support@indxr.ai" className="text-[var(--accent)] hover:underline">support@indxr.ai</a>.
          </p>
        </section>
      </main>
    </>
  )
}
