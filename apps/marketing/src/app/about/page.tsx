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
            INDXR.AI is built and operated by Tiny Web Ventures, a one-person sole
            proprietorship registered in the Netherlands (KvK 98828762). It&apos;s the work
            of a single maker rather than a team, and we keep the attention on the
            product instead of a personal brand — so you won&apos;t find a founder story
            here, just a tool that does what it says.
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
