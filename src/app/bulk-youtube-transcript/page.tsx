import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Layers, Download, Clock, Archive, CheckCircle, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Bulk YouTube Transcript Download - Extract Multiple Videos | INDXR.AI",
  description: "Download transcripts from multiple YouTube videos at once. Bulk extraction for playlists and video collections. Export to TXT, SRT, VTT, or JSON.",
  openGraph: {
    title: "Bulk YouTube Transcript Download | INDXR.AI",
    description: "Download transcripts from multiple YouTube videos at once. Bulk extraction for playlists and video collections.",
    type: "website",
    url: "https://indxr.ai/bulk-youtube-transcript",
  },
};

const features = [
  {
    icon: Layers,
    title: "Playlist Batch Processing",
    description: "Paste a playlist URL and extract all videos at once. No need to process each video individually.",
  },
  {
    icon: Archive,
    title: "Bulk Export Options",
    description: "Download all transcripts as individual files or as a single ZIP archive. Choose your preferred format for each.",
  },
  {
    icon: Clock,
    title: "Time-Saving Automation",
    description: "What would take hours manually completes in minutes. Process 50+ videos while you focus on other work.",
  },
  {
    icon: CheckCircle,
    title: "Quality Assurance",
    description: "Each transcript is validated before saving. Failed extractions are flagged so you know exactly which videos need attention.",
  },
];

const steps = [
  {
    number: "1",
    title: "Choose Your Source",
    description: "Use the Playlist tab to enter a YouTube playlist URL. We support playlists of any size.",
  },
  {
    number: "2",
    title: "Select Videos",
    description: "After scanning, select which videos to include. Skip unavailable videos or those without captions (unless using Whisper AI).",
  },
  {
    number: "3",
    title: "Bulk Extract",
    description: "Start the extraction. Progress is tracked for each video. All completed transcripts are saved to your library.",
  },
];

const faqs = [
  {
    question: "How many videos can I bulk download at once?",
    answer: "There's no hard limit on playlist size. Free users get 50 playlist video extractions per month. For larger volumes, credits can be purchased (1 credit = 10 additional videos).",
  },
  {
    question: "What formats are available for bulk export?",
    answer: "Each transcript can be exported as TXT (with or without timestamps), SRT, VTT, CSV, or JSON. You can export all transcripts in your preferred format or mix formats as needed.",
  },
  {
    question: "Can I bulk download from multiple playlists?",
    answer: "Yes. Process one playlist, then add another. All transcripts are saved to your library where you can manage and export them together.",
  },
  {
    question: "What if some videos fail during bulk extraction?",
    answer: "Failed videos are clearly marked with the failure reason (e.g., 'no captions available', 'video unavailable'). You can retry failed videos individually or skip them.",
  },
];

export default function BulkYouTubeTranscriptPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI Bulk Transcript Downloader",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Bulk download YouTube video transcripts from playlists and video collections.",
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
              Bulk YouTube Transcript Download
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop extracting videos one at a time. Download transcripts from entire playlists in a single operation. Save hours of manual work.
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
              Bulk Download Features
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
              How Bulk Download Works
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

        {/* Comparison Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Manual vs. Bulk Extraction
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Manual Process</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li>• Open each video individually</li>
                    <li>• Copy transcript from YouTube UI</li>
                    <li>• Paste and format in document</li>
                    <li>• Repeat 50+ times for a playlist</li>
                    <li>• Takes 2-4 hours minimum</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border border-primary">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">With INDXR.AI</h3>
                  <ul className="space-y-3">
                    <li>• Paste one playlist URL</li>
                    <li>• Click extract</li>
                    <li>• Download all transcripts</li>
                    <li>• 50 videos in ~10 minutes</li>
                    <li>• Formatted and ready to use</li>
                  </ul>
                </CardContent>
              </Card>
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
              Ready for Bulk Extraction?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start with 50 free playlist extractions. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Start Transcribing Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-srt-download">Download SRT Subtitles</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
