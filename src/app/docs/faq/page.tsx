import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"
import { ArrowRight } from "lucide-react"
import { DocsShell } from "@/components/docs/DocsShell"

export const metadata: Metadata = {
  title: "YouTube Transcript FAQ — INDXR.AI",
  description:
    "Answers to common questions about downloading YouTube transcripts, extracting subtitles as SRT files, transcribing playlists in bulk, and using AI to transcribe videos without captions.",
  openGraph: {
    title: "YouTube Transcript FAQ — INDXR.AI",
    description:
      "Answers to common questions about downloading YouTube transcripts, extracting subtitles, and AI transcription.",
    type: "website",
    url: "https://indxr.ai/docs/faq",
  },
}

type FAQ = { question: string; answer: string }
type FAQCategory = { title: string; faqs: FAQ[] }

const faqCategories: FAQCategory[] = [
  {
    title: "General",
    faqs: [
      {
        question: "What is INDXR.AI and what can I use it for?",
        answer:
          "INDXR.AI is a web-based tool for extracting transcripts from YouTube videos. You can use it to download captions as text files, generate subtitles in SRT or VTT format, process entire playlists at once, and transcribe videos that don't have captions using AI. Content creators use it to repurpose video content into blog posts. Researchers use it to analyze interview data. Students use it to create study notes from lecture videos.",
      },
      {
        question: "Does INDXR.AI work without installing a Chrome extension?",
        answer:
          "Yes, INDXR.AI is 100% web-based. You don't need to install any browser extension, plugin, or software. Just open the website in any browser (Chrome, Firefox, Safari, Edge, or mobile browsers) and paste a YouTube URL. Learn more about our <a href='/youtube-transcript-without-extension'>extension-free approach</a>.",
      },
      {
        question: "Do I need to create an account to use INDXR.AI?",
        answer:
          "No account is required for basic transcript extraction from single videos. Creating a free account unlocks additional features: a personal transcript library, playlist extraction, and AI transcription.",
      },
      {
        question: "Can I use transcripts I download for commercial purposes?",
        answer:
          "Yes, you can use transcripts for any purpose including commercial projects. However, the content of the transcript belongs to the original video creator. INDXR.AI only extracts publicly available captions — we don't grant rights to the underlying content.",
      },
    ],
  },
  {
    title: "YouTube Transcripts",
    faqs: [
      {
        question: "How do I download a YouTube transcript as a text file?",
        answer:
          "Go to the <a href='/dashboard/transcribe'>Transcribe page</a>, paste the YouTube video URL into the input field, and click Extract. Once the transcript loads, click the Export button and select TXT format.",
      },
      {
        question: "Can I get a transcript from a YouTube video without captions?",
        answer:
          "Yes, using our AI transcription feature. When a video doesn't have captions, INDXR.AI can transcribe the audio using AssemblyAI. This feature uses credits (1 credit per minute of audio). Learn more about <a href='/audio-to-text'>AI transcription</a>.",
      },
      {
        question: "How do I transcribe an entire YouTube playlist at once?",
        answer:
          "Use the Playlist tab in the dashboard. Paste the playlist URL, and INDXR.AI will scan all videos. See our <a href='/youtube-playlist-transcript'>playlist extraction guide</a> for details.",
      },
      {
        question: "Can I download YouTube subtitles in SRT format?",
        answer:
          "Yes. After extracting a transcript, click Export and select SRT. See our <a href='/youtube-srt-download'>SRT download guide</a> for more information.",
      },
    ],
  },
  {
    title: "Pricing & Credits",
    faqs: [
      {
        question: "How much does it cost to transcribe a YouTube video?",
        answer:
          "Extracting transcripts from videos with existing YouTube captions costs 0 credits. For AI transcription, 1 credit = 1 minute of audio. Check our <a href='/pricing'>pricing page</a> for current packages.",
      },
      {
        question: "Do my credits expire?",
        answer:
          "No, purchased credits never expire. Once you buy a package, those credits remain in your account until you use them.",
      },
      {
        question: "How does the credit system work?",
        answer:
          "Credits are used for AI transcription (1 credit per minute) and AI summarization (3 credits per summary). Your credit balance is shown in your dashboard. View packages on our <a href='/pricing'>pricing page</a>.",
      },
    ],
  },
  {
    title: "Technical",
    faqs: [
      {
        question: "What export formats are available?",
        answer:
          "INDXR.AI supports: TXT (with or without timestamps), SRT, VTT, CSV, Markdown, and RAG-optimized JSON. All formats are available for both YouTube caption extraction and AI transcription.",
      },
      {
        question: "How long does transcript extraction take?",
        answer:
          "For videos with existing YouTube captions, extraction is nearly instant (1-3 seconds). For AI transcription, processing time is roughly 1-2 minutes per 10 minutes of audio.",
      },
    ],
  },
]

const allFaqs = faqCategories.flatMap((c) => c.faqs)

export default function DocsFaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.replace(/<[^>]*>/g, ""),
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <DocsShell>
        <article>
          <h1 className="text-3xl font-semibold text-[var(--fg)] mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-[var(--fg-subtle)] mb-10">
            Answers to common questions about transcripts, exports, and credits.
          </p>

          {faqCategories.map((category) => (
            <div key={category.title} className="mb-10">
              <h2 className="text-xl font-semibold text-[var(--fg)] mb-4 pb-2 border-b border-[var(--border)]">
                {category.title}
              </h2>
              <div className="space-y-3">
                {category.faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)]"
                  >
                    <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-[var(--fg)] hover:bg-[var(--surface-elevated)] rounded-[var(--radius)] transition-colors">
                      <span className="pr-4">{faq.question}</span>
                      <span className="shrink-0 text-[var(--fg-muted)] group-open:rotate-180 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 text-[var(--fg-muted)] leading-relaxed text-sm">
                      <p
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                        className="[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4"
                      />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-12 p-6 rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] border border-[var(--border)] text-center">
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-2">Still have questions?</h2>
            <p className="text-[var(--fg-muted)] text-sm mb-5">
              Contact our support team or try the transcript extractor for free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild>
                <Link href="/youtube-transcript-generator">
                  Try it free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/support">Contact Support</Link>
              </Button>
            </div>
          </div>
        </article>
      </DocsShell>
      <Footer />
    </>
  )
}
