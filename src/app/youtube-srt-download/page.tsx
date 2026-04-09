import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { FileVideo, Download, Clock, Subtitles, CheckCircle, Languages } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube SRT Download - Free Subtitle File Extractor | INDXR.AI",
  description: "Download YouTube subtitles as SRT files. Free tool to extract captions in SRT or VTT format for video editing, translation, and accessibility.",
  openGraph: {
    title: "YouTube SRT Download - Free Subtitle Extractor | INDXR.AI",
    description: "Download YouTube subtitles as SRT files. Free tool to extract captions in SRT or VTT format.",
    type: "website",
    url: "https://indxr.ai/youtube-srt-download",
  },
};

const features = [
  {
    icon: Subtitles,
    title: "SRT & VTT Formats",
    description: "Download subtitles in industry-standard SRT format or WebVTT for web video players. Both formats include precise timestamps.",
  },
  {
    icon: Clock,
    title: "Accurate Timing",
    description: "Timestamps are extracted directly from YouTube's caption data. Subtitles sync perfectly with the original video.",
  },
  {
    icon: FileVideo,
    title: "Video Editor Compatible",
    description: "SRT files work with Premiere Pro, Final Cut, DaVinci Resolve, and all major video editors. Import and edit subtitles directly.",
  },
  {
    icon: Languages,
    title: "Multi-Language Support",
    description: "If the video has captions in multiple languages, you get the primary language. Whisper AI can transcribe any spoken language.",
  },
];

const steps = [
  {
    number: "1",
    title: "Enter the YouTube URL",
    description: "Paste the video link. We support standard youtube.com URLs and shortened youtu.be links.",
  },
  {
    number: "2",
    title: "Extract the Transcript",
    description: "Click extract. We pull the official YouTube captions with all timing information intact.",
  },
  {
    number: "3",
    title: "Download as SRT",
    description: "Choose SRT or VTT from the export menu. The file downloads instantly, ready for your video editor.",
  },
];

const faqs = [
  {
    question: "What is an SRT file?",
    answer: "SRT (SubRip Subtitle) is the most widely used subtitle format. It contains numbered subtitle entries with start/end timestamps and the subtitle text. Nearly every video editor and media player supports SRT files.",
  },
  {
    question: "Can I download SRT files for free?",
    answer: "Yes. Extracting subtitles from videos with existing YouTube captions is completely free. The SRT export option is available for all users at no cost.",
  },
  {
    question: "What's the difference between SRT and VTT?",
    answer: "SRT is the traditional format for video editing software. VTT (WebVTT) is the web standard, used by HTML5 video players. Both contain the same timing and text data, just formatted differently.",
  },
  {
    question: "Can I get SRT files for videos without captions?",
    answer: "Yes, using our Whisper AI transcription. We extract the audio, transcribe it with speech recognition, and generate an SRT file with accurate timestamps. This uses credits (1 per 10 minutes).",
  },
];

export default function YouTubeSrtDownloadPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI SRT Subtitle Downloader",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Download YouTube subtitles as SRT or VTT files for video editing and accessibility.",
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
              YouTube SRT Download
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Download YouTube subtitles as SRT or VTT files. Perfect for video editing, translation projects, and accessibility compliance.
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
              SRT Download Features
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
              How to Download SRT Files
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

        {/* SRT Format Example */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              SRT File Format
            </h2>
            <Card className="border">
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">
                  SRT files are plain text with a simple structure. Each subtitle entry has a sequence number, timestamp, and text:
                </p>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`1
00:00:01,000 --> 00:00:04,500
Welcome to this tutorial on machine learning.

2
00:00:05,000 --> 00:00:09,200
Today we'll cover the fundamentals of neural networks.

3
00:00:10,000 --> 00:00:14,800
Let's start by understanding what a perceptron is.`}
                </pre>
              </CardContent>
            </Card>
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
              Download Your First SRT File
            </h2>
            <p className="text-muted-foreground mb-8">
              Free for videos with existing captions. No sign-up required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Start Transcribing Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-transcript-downloader">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
