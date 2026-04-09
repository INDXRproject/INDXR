import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Globe, Shield, Zap, Download, CheckCircle, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube Transcript Without Extension - No Install Required | INDXR.AI",
  description: "Get YouTube transcripts without installing any browser extension. 100% web-based tool that works on any browser. Extract captions instantly.",
  openGraph: {
    title: "YouTube Transcript Without Extension | INDXR.AI",
    description: "Get YouTube transcripts without installing any browser extension. 100% web-based tool that works on any browser.",
    type: "website",
    url: "https://indxr.ai/youtube-transcript-without-extension",
  },
};

const features = [
  {
    icon: Globe,
    title: "100% Web-Based",
    description: "No downloads, no extensions, no plugins. INDXR.AI runs entirely in your browser. Works on Chrome, Firefox, Safari, Edge, and mobile browsers.",
  },
  {
    icon: Shield,
    title: "No Permissions Required",
    description: "Browser extensions need access to your browsing data. Our web app doesn't. Your privacy stays intact.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Skip the install process. Paste a URL and get your transcript immediately. No account required for basic use.",
  },
  {
    icon: RefreshCw,
    title: "Always Up to Date",
    description: "No extension updates to manage. We handle all updates server-side. You always get the latest features automatically.",
  },
];

const comparisonPoints = [
  {
    extension: "Requires installation",
    indxr: "Works instantly in browser",
  },
  {
    extension: "Needs browser permissions",
    indxr: "No permissions needed",
  },
  {
    extension: "Updates manually",
    indxr: "Always current version",
  },
  {
    extension: "Chrome/Firefox only",
    indxr: "Any browser, any device",
  },
  {
    extension: "Can slow down browser",
    indxr: "Zero browser overhead",
  },
  {
    extension: "Privacy concerns",
    indxr: "No data collection",
  },
];

const faqs = [
  {
    question: "Why use a web app instead of a browser extension?",
    answer: "Browser extensions require installation, permissions, and can access your browsing history. A web-based tool like INDXR.AI works instantly with no install, no permissions, and no impact on browser performance.",
  },
  {
    question: "Does INDXR.AI work on mobile devices?",
    answer: "Yes. Since it's a web app, INDXR.AI works on any device with a browser — iPhone, Android, iPad, or desktop. Extensions don't work on mobile browsers.",
  },
  {
    question: "Is it really free without an extension?",
    answer: "Yes. Extracting transcripts from videos with existing YouTube captions is free. No extension, no account required. For videos without captions, our Whisper AI fallback uses credits.",
  },
  {
    question: "What about videos without captions?",
    answer: "When a video has no captions, we use OpenAI's Whisper to transcribe the audio. This produces accurate transcripts for videos in any language, regardless of whether the creator added subtitles.",
  },
];

export default function YouTubeTranscriptWithoutExtensionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI Web Transcript Tool",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Extract YouTube transcripts without installing any browser extension. 100% web-based.",
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
              YouTube Transcript Without Extension
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              No browser extension needed. No installation. No permissions. Just paste a YouTube URL and get the transcript. Works on any browser, any device.
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
              Why Skip the Extension
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

        {/* Comparison Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Extension vs. Web App
            </h2>
            <div className="space-y-4">
              {comparisonPoints.map((point, index) => (
                <div key={index} className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md text-muted-foreground">
                    {point.extension}
                  </div>
                  <div className="p-4 bg-primary/10 rounded-md font-medium">
                    {point.indxr}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Open INDXR.AI</h3>
                  <p className="text-muted-foreground">Visit the dashboard in any browser. No sign-up required for basic transcript extraction.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Paste the YouTube URL</h3>
                  <p className="text-muted-foreground">Copy the video link from YouTube. We support youtube.com and youtu.be formats.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Download Your Transcript</h3>
                  <p className="text-muted-foreground">Choose your format (TXT, SRT, VTT, JSON) and download. Save to your library for future access.</p>
                </div>
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
              Ready to Try Extension-Free?
            </h2>
            <p className="text-muted-foreground mb-8">
              No install. No permissions. Just transcripts.
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
