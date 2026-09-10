import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About INDXR.AI",
  description:
    "INDXR.AI turns recordings into text you can work with — uploaded audio and video, YouTube links, or a whole playlist at once. Who runs it, why it exists, and where it runs.",
}

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    description:
      "Turn recordings into text you can work with — uploaded audio and video, YouTube links, or whole playlists. Caption extraction, AI transcription, and multi-format export.",
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
      {/* pt-28 (7rem) clears the fixed h-16 (4rem) header and leaves a 3rem gap below it, matching the
          first-content offset on /articles and /pricing. Shared spacing across the standalone content
          pages (About/Compare/Privacy/Terms/Contact). */}
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fg)] mb-6">
          About INDXR.AI
        </h1>

        <section className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-6">
          <p>
            INDXR.AI turns recordings into text you can work with: audio and video you upload, YouTube
            links, or a whole playlist at once. This page is about who runs it and how. For what the
            tool does, start on the{" "}
            <a href="/" className="text-[var(--link)] hover:underline">homepage</a>.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Why it exists</h2>
          <p>
            There is more good material out there than anyone can get through. Podcasts, lectures, long
            interviews. I could not listen to all of it, but I still wanted to know what was in it.
          </p>
          <p>
            So I started transcribing things and reading the summary first. If it turned out to be worth
            it, I read the whole transcript, or went back to the audio. What I ended up with was a
            collection of sources I could actually come back to — searchable, in one place, instead of
            scattered across tabs and half-finished notes. It changed how I work: my sources feed my
            notes, I go back over them instead of hunting through audio again, and more of it stays with
            me.
          </p>
          <p>
            INDXR.AI is built around that. It is not trying to replace where you write. It is the step
            before that: transcribe, edit, keep your sources organised in a library, and export to
            whatever you actually work in. Markdown and text for notes, SRT and VTT for subtitles,
            structured JSON for feeding a source to an LLM.
          </p>
          <p>
            That is one way of working, and it is mine. The export formats exist so it can fit into
            other ones too, and I hope it grows to support more of them.
          </p>

          <h2 className="text-xl font-semibold text-[var(--fg)] mt-8">Who builds it</h2>
          <p>
            I build it on my own. It is operated by Tiny Web Ventures, based in the Netherlands. Full
            company details are in our{" "}
            <a href="/terms" className="text-[var(--link)] hover:underline">Terms</a>.
          </p>
          <p>
            Pricing is credits you buy once. They do not expire and there is no subscription. YouTube
            captions cost nothing at all. I built it that way because every tool I tried wanted a
            monthly fee for something I needed occasionally.
          </p>
          <p>
            I am curious how people use it and what would make it better.{" "}
            <a href="/contact" className="text-[var(--link)] hover:underline">Send feedback</a>. I read
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
            Questions? Use our <a href="/contact" className="text-[var(--link)] hover:underline">contact form</a>,
            or email us directly at{" "}
            <a href="mailto:support@indxr.ai" className="text-[var(--link)] hover:underline">support@indxr.ai</a>.
          </p>
        </section>
      </main>
    </>
  )
}
