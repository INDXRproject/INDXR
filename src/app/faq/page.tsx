import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "YouTube Transcript Generator FAQ | INDXR.AI",
  description: "Common questions about YouTube transcript generation, export formats, pricing, and features. Learn how to extract and download YouTube captions.",
  openGraph: {
    title: "YouTube Transcript Generator FAQ | INDXR.AI",
    description: "Common questions about YouTube transcript generation, export formats, pricing, and features.",
    type: "website",
  },
}

const faqs = [
  {
    question: "How do I generate a YouTube transcript?",
    answer: "Simply paste a YouTube video URL into our transcript generator tool. We'll automatically extract the captions and provide you with a downloadable transcript in multiple formats (TXT, JSON, CSV, SRT, VTT)."
  },
  {
    question: "What formats can I export YouTube transcripts to?",
    answer: "We support 6 export formats: Plain text (TXT) with or without timestamps, JSON for developers, CSV for spreadsheets, SRT and VTT for subtitle files. All formats are available for free."
  },
  {
    question: "Is the YouTube transcript generator free?",
    answer: "Yes! Our basic transcript generator is completely free for single videos using YouTube's auto-generated captions. Premium features include playlist extraction (50 videos/month for free users) and AI-powered Whisper transcription for videos without captions."
  },
  {
    question: "What's the difference between auto-captions and AI transcription?",
    answer: "Auto-captions use YouTube's built-in captions that are already available on the video. AI transcription uses OpenAI's Whisper model to generate transcripts from the audio for videos that don't have captions. AI transcription requires credits."
  },
  {
    question: "How accurate are YouTube auto-generated captions?",
    answer: "YouTube's auto-generated captions are generally 70-90% accurate depending on audio quality, accents, and technical terminology. For higher accuracy on videos without captions, use our AI-powered Whisper transcription feature."
  },
  {
    question: "Can I download transcripts for private videos?",
    answer: "No, you can only generate transcripts for public YouTube videos. Private or unlisted videos require authentication that we don't support for privacy and security reasons."
  },
  {
    question: "Can I extract transcripts from entire playlists?",
    answer: "Yes! Free users get 50 playlist videos per month. Premium users can purchase credits: 1 credit = 10 videos beyond your monthly quota. This makes bulk extraction affordable and efficient."
  },
  {
    question: "How does the credit system work?",
    answer: "Credits are used for premium features: AI Whisper transcription (1 credit = 10 minutes of audio) and playlist extraction beyond your free quota (1 credit = 10 videos). You can purchase credits in packages starting at $5 for 10 credits."
  },
  {
    question: "Do I need to create an account?",
    answer: "No account is required for basic single-video transcription. However, creating a free account unlocks playlist extraction (50 videos/month) and allows you to save your transcript history."
  },
  {
    question: "What languages are supported?",
    answer: "We support all languages that YouTube supports for auto-captions (100+ languages). Our AI Whisper transcription supports 99 languages including English, Spanish, French, German, Chinese, Japanese, and many more."
  },
  {
    question: "How long does it take to generate a transcript?",
    answer: "Auto-caption extraction is instant (1-3 seconds). AI Whisper transcription takes approximately 10-30 seconds depending on video length. Playlist extraction processes videos sequentially."
  },
  {
    question: "Can I use transcripts for commercial purposes?",
    answer: "Yes, you can use the transcripts for any purpose. However, please ensure you have the right to use the content from the original video creator. We only extract publicly available captions."
  },
]

export default function FAQPage() {
  // JSON-LD Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 bg-background flex justify-center border-b relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
          <div className="container px-4 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-[700px] mx-auto">
              Everything you need to know about generating YouTube transcripts with INDXR.AI
            </p>
          </div>
        </section>

        {/* FAQ Grid */}
        <section className="w-full py-16 md:py-24 bg-background flex justify-center">
          <div className="container px-4 max-w-4xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-colors"
                >
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    {faq.question}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="mt-16 text-center p-8 rounded-2xl bg-muted border">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Still have questions?
              </h2>
              <p className="text-muted-foreground mb-6">
                Contact our support team or try the transcript generator for free
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/youtube-transcript-generator">
                  <Button size="lg" className="h-12 px-8">
                    Try It Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/support">
                  <Button size="lg" variant="outline" className="h-12 px-8">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
