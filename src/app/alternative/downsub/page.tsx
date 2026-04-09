import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { CheckCircle, X, Zap, FileText, Shield, Mic } from "lucide-react";

export const metadata: Metadata = {
  title: "DownSub Alternative - Better YouTube Transcript Tool | INDXR.AI",
  description: "Looking for a DownSub alternative? INDXR.AI offers more export formats, AI transcription for videos without captions, and a personal transcript library.",
  openGraph: {
    title: "DownSub Alternative | INDXR.AI",
    description: "Looking for a DownSub alternative? INDXR.AI offers more export formats, AI transcription, and a personal library.",
    type: "website",
    url: "https://indxr.ai/alternative/downsub",
  },
};

const comparisonFeatures = [
  {
    feature: "Extract YouTube captions",
    downsub: true,
    indxr: true,
  },
  {
    feature: "SRT/VTT subtitle export",
    downsub: true,
    indxr: true,
  },
  {
    feature: "Plain text export",
    downsub: false,
    indxr: true,
  },
  {
    feature: "JSON export for developers",
    downsub: false,
    indxr: true,
  },
  {
    feature: "AI transcription (no captions)",
    downsub: false,
    indxr: true,
  },
  {
    feature: "Playlist batch processing",
    downsub: false,
    indxr: true,
  },
  {
    feature: "Personal transcript library",
    downsub: false,
    indxr: true,
  },
  {
    feature: "Audio file upload",
    downsub: false,
    indxr: true,
  },
  {
    feature: "AI summarization",
    downsub: false,
    indxr: true,
  },
  {
    feature: "No ads",
    downsub: false,
    indxr: true,
  },
];

const advantages = [
  {
    icon: Mic,
    title: "Whisper AI Fallback",
    description: "DownSub only works if the video has existing captions. INDXR.AI uses Whisper AI to transcribe any video, even those without subtitles.",
  },
  {
    icon: FileText,
    title: "More Export Formats",
    description: "Beyond SRT and VTT, export to plain text (with or without timestamps), CSV for spreadsheets, and JSON for programmatic access.",
  },
  {
    icon: Shield,
    title: "Clean Interface",
    description: "No intrusive ads or pop-ups. INDXR.AI provides a clean, focused experience without distracting advertisements.",
  },
  {
    icon: Zap,
    title: "Playlist Processing",
    description: "Extract transcripts from entire YouTube playlists at once. DownSub requires you to process each video individually.",
  },
];

const faqs = [
  {
    question: "Why switch from DownSub to INDXR.AI?",
    answer: "DownSub is limited to videos with existing captions and only exports SRT/VTT files. INDXR.AI can transcribe any video using AI, offers more export formats, and saves transcripts to a personal library for future access.",
  },
  {
    question: "Is INDXR.AI free like DownSub?",
    answer: "Yes, extracting transcripts from videos with existing YouTube captions is completely free. AI transcription for videos without captions uses credits (1 credit per 10 minutes of audio).",
  },
  {
    question: "Does INDXR.AI show ads?",
    answer: "No. INDXR.AI has no advertisements. The service is supported by optional credit purchases for advanced features like Whisper AI transcription and AI summarization.",
  },
  {
    question: "Can I export in the same formats as DownSub?",
    answer: "Yes, plus more. INDXR.AI supports SRT and VTT (like DownSub), plus TXT with timestamps, TXT without timestamps, CSV, and JSON formats.",
  },
];

export default function DownSubAlternativePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "DownSub alternative with AI transcription, more export formats, and playlist support.",
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
              DownSub Alternative
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Looking for more than basic subtitle downloads? INDXR.AI transcribes videos without captions, processes entire playlists, and exports to formats DownSub doesn't support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Try INDXR.AI Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              INDXR.AI vs DownSub
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4">Feature</th>
                    <th className="text-center py-4 px-4">DownSub</th>
                    <th className="text-center py-4 px-4 bg-primary/5">INDXR.AI</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="border-b">
                      <td className="py-4 px-4">{row.feature}</td>
                      <td className="text-center py-4 px-4">
                        {row.downsub ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-primary/5">
                        {row.indxr ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Advantages Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Choose INDXR.AI Over DownSub
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {advantages.map((advantage) => (
                <Card key={advantage.title} className="border">
                  <CardContent className="p-6">
                    <advantage.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{advantage.title}</h3>
                    <p className="text-muted-foreground">{advantage.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Migration Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Switching from DownSub
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Same Workflow</h3>
                  <p className="text-muted-foreground">Paste a YouTube URL, click extract, download. If you know DownSub, you already know how to use INDXR.AI.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Same Formats Plus More</h3>
                  <p className="text-muted-foreground">Export SRT and VTT just like DownSub. When you need plain text, CSV, or JSON, those options are available too.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Handle the Edge Cases</h3>
                  <p className="text-muted-foreground">Video without captions? Whisper AI transcribes it. Need 50 videos from a playlist? Batch process them all at once.</p>
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
              Ready to Upgrade from DownSub?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Try INDXR.AI Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-transcript-downloader">See All Features</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
