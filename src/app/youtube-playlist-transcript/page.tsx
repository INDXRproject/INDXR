import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { ListVideo, Download, Clock, FolderOpen, CheckCircle, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube Playlist Transcript Extractor - Batch Download | INDXR.AI",
  description: "Extract transcripts from entire YouTube playlists. Download all video captions at once in TXT, SRT, VTT, or JSON. Save hours of manual work.",
  openGraph: {
    title: "YouTube Playlist Transcript Extractor | INDXR.AI",
    description: "Extract transcripts from entire YouTube playlists. Download all video captions at once.",
    type: "website",
    url: "https://indxr.ai/youtube-playlist-transcript",
  },
};

const features = [
  {
    icon: ListVideo,
    title: "Full Playlist Support",
    description: "Paste any YouTube playlist URL and extract transcripts from every video. We handle playlists with hundreds of videos.",
  },
  {
    icon: CheckCircle,
    title: "Availability Pre-Check",
    description: "Before extraction, we scan each video to identify which have captions and which need Whisper AI transcription.",
  },
  {
    icon: FolderOpen,
    title: "Organized Library",
    description: "All extracted transcripts are saved to your personal library, organized by playlist for easy access later.",
  },
  {
    icon: Zap,
    title: "Parallel Processing",
    description: "Multiple videos are processed simultaneously. A 50-video playlist completes faster than you might expect.",
  },
];

const steps = [
  {
    number: "1",
    title: "Paste the Playlist URL",
    description: "Copy the full playlist link from YouTube (the URL containing 'list=').",
  },
  {
    number: "2",
    title: "Review Video Availability",
    description: "We scan the playlist and show you which videos have captions available. Select which ones to extract.",
  },
  {
    number: "3",
    title: "Extract and Download",
    description: "Start extraction. Each video's transcript is processed and saved. Download individually or export in bulk.",
  },
];

const faqs = [
  {
    question: "How many videos can I extract from a playlist?",
    answer: "Free users can extract up to 50 videos per month from playlists. For larger playlists or higher volumes, credits can be purchased. Each additional batch of 10 videos costs 1 credit.",
  },
  {
    question: "What happens if a video in the playlist has no captions?",
    answer: "Our availability scanner identifies these videos before extraction. You can choose to skip them or use Whisper AI to transcribe the audio (costs 1 credit per 10 minutes).",
  },
  {
    question: "Can I export all playlist transcripts at once?",
    answer: "Yes. After extraction, you can download all transcripts from a playlist as individual files or use the batch export feature to get them as a ZIP archive.",
  },
  {
    question: "Are private or unlisted playlists supported?",
    answer: "INDXR.AI works with public and unlisted playlists. Private playlists require the videos to be accessible via a shareable link.",
  },
];

export default function YouTubePlaylistTranscriptPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI Playlist Transcript Extractor",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Extract transcripts from entire YouTube playlists in bulk.",
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
              YouTube Playlist Transcript Extractor
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Extract transcripts from entire playlists at once. Stop downloading videos one by one. Paste a playlist URL and get every transcript in minutes.
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
              Playlist Extraction Features
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
              How Playlist Extraction Works
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

        {/* Use Cases Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Who Uses Playlist Transcription
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3">Researchers</h3>
                <p className="text-muted-foreground">
                  Analyze lecture series, interview collections, or documentary playlists. Export to JSON for data processing or plain text for qualitative analysis.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Content Creators</h3>
                <p className="text-muted-foreground">
                  Repurpose your own video content. Extract transcripts from your entire channel's playlists to create blog posts, ebooks, or course materials.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Students</h3>
                <p className="text-muted-foreground">
                  Download transcripts from educational playlists. Search through lecture content, create study notes, and reference specific timestamps.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Journalists</h3>
                <p className="text-muted-foreground">
                  Quickly transcribe press conferences, interview series, or news segments. Full-text search across multiple videos saves research time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
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
        <section className="py-20 px-4 border-t">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">
              Extract Your First Playlist
            </h2>
            <p className="text-muted-foreground mb-8">
              50 free playlist video extractions per month. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Start Transcribing Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/bulk-youtube-transcript">Learn About Bulk Downloads</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
