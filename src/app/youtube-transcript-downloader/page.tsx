import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Download, Zap, FileText, Clock, CheckCircle, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube Transcript Downloader - Free Online Tool | INDXR.AI",
  description: "Download YouTube video transcripts instantly. Free online tool to extract captions and subtitles from any YouTube video. Export to TXT, SRT, VTT, or JSON format.",
  openGraph: {
    title: "YouTube Transcript Downloader - Free Online Tool | INDXR.AI",
    description: "Download YouTube video transcripts instantly. Free online tool to extract captions and subtitles from any YouTube video.",
    type: "website",
    url: "https://indxr.ai/youtube-transcript-downloader",
  },
};

const features = [
  {
    icon: Zap,
    title: "Instant Extraction",
    description: "Paste a YouTube URL and get the full transcript in seconds. No waiting, no queues.",
  },
  {
    icon: FileText,
    title: "Multiple Export Formats",
    description: "Download as plain text (TXT), subtitles (SRT/VTT), spreadsheet-ready CSV, or structured JSON.",
  },
  {
    icon: Globe,
    title: "Works With Any Video",
    description: "Extract transcripts from videos with existing captions. For videos without captions, our Whisper AI fallback generates accurate transcripts.",
  },
  {
    icon: Clock,
    title: "Timestamps Included",
    description: "Keep precise timestamps for each segment, or export clean text without them. Your choice.",
  },
];

const steps = [
  {
    number: "1",
    title: "Paste the YouTube URL",
    description: "Copy the video link from YouTube and paste it into the input field.",
  },
  {
    number: "2",
    title: "Extract the Transcript",
    description: "Click extract and we pull the captions directly from YouTube. If none exist, Whisper AI transcribes the audio.",
  },
  {
    number: "3",
    title: "Download Your Format",
    description: "Choose TXT, SRT, VTT, CSV, or JSON and download instantly. Save to your library for later access.",
  },
];

const faqs = [
  {
    question: "Is INDXR.AI free to use?",
    answer: "Yes. Extracting transcripts from videos with existing YouTube captions is completely free. For videos without captions, our Whisper AI fallback uses credits (1 credit per 10 minutes of audio).",
  },
  {
    question: "What video formats are supported?",
    answer: "INDXR.AI works with any public YouTube video. We extract the official captions when available, or transcribe the audio using Whisper AI when captions don't exist.",
  },
  {
    question: "Can I download transcripts in bulk?",
    answer: "Yes. Use our playlist extraction feature to download transcripts from entire YouTube playlists at once. Each video in the playlist is processed and saved to your library.",
  },
  {
    question: "Are the transcripts accurate?",
    answer: "For videos with official captions, accuracy matches YouTube's own subtitles. For Whisper AI transcriptions, accuracy is typically 95%+ for clear speech in supported languages.",
  },
];

export default function YouTubeTranscriptDownloaderPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI YouTube Transcript Downloader",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Download YouTube video transcripts instantly. Export to TXT, SRT, VTT, or JSON format.",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              YouTube Transcript Downloader
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Extract and download transcripts from any YouTube video. Free, fast, and no browser extension required. Export to TXT, SRT, VTT, or JSON.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Start Transcribing Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Use INDXR.AI for Transcript Downloads
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border">
                  <CardContent className="p-6">
                    <feature.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              How to Download YouTube Transcripts
            </h2>
            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Download Your First Transcript?
            </h2>
            <p className="text-muted-foreground mb-8">
              No sign-up required for basic use. Create a free account to save transcripts to your personal library.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Start Transcribing Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-playlist-transcript">Try Playlist Extraction</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
