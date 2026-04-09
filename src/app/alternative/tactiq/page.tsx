import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { CheckCircle, X, Globe, Layers, Download, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Tactiq Alternative - No Extension Needed | INDXR.AI",
  description: "Looking for a Tactiq alternative without installing extensions? INDXR.AI is 100% web-based. Extract YouTube transcripts, process playlists, and export to multiple formats.",
  openGraph: {
    title: "Tactiq Alternative | INDXR.AI",
    description: "Looking for a Tactiq alternative without installing extensions? INDXR.AI is 100% web-based.",
    type: "website",
    url: "https://indxr.ai/alternative/tactiq",
  },
};

const comparisonFeatures = [
  {
    feature: "YouTube transcript extraction",
    tactiq: true,
    indxr: true,
  },
  {
    feature: "No browser extension required",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "Works on any browser",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "Works on mobile devices",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "Playlist batch processing",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "SRT/VTT subtitle export",
    tactiq: true,
    indxr: true,
  },
  {
    feature: "JSON export",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "Audio file upload",
    tactiq: false,
    indxr: true,
  },
  {
    feature: "Personal transcript library",
    tactiq: true,
    indxr: true,
  },
  {
    feature: "AI summarization",
    tactiq: true,
    indxr: true,
  },
  {
    feature: "Free tier available",
    tactiq: true,
    indxr: true,
  },
];

const advantages = [
  {
    icon: Globe,
    title: "No Extension Required",
    description: "Tactiq requires a Chrome extension that accesses your browsing data. INDXR.AI is 100% web-based. No installation, no browser permissions.",
  },
  {
    icon: Shield,
    title: "Works Everywhere",
    description: "Extensions only work on desktop Chrome and Firefox. INDXR.AI works on any device — iPhone, Android, Safari, Edge, or any browser.",
  },
  {
    icon: Layers,
    title: "Playlist Processing",
    description: "Extract transcripts from entire YouTube playlists at once. Tactiq processes videos one at a time as you watch them.",
  },
  {
    icon: Download,
    title: "More Export Formats",
    description: "Export as TXT, SRT, VTT, CSV, or JSON. Developer-friendly JSON includes timestamps and metadata for programmatic use.",
  },
];

const focusDifferences = [
  {
    title: "Tactiq's Focus",
    description: "Tactiq is designed primarily for live meeting transcription (Google Meet, Zoom). YouTube transcription is a secondary feature that requires watching videos in real-time.",
    points: [
      "Real-time meeting transcription",
      "Chrome extension required",
      "Must watch videos to transcribe",
      "Focused on collaboration features",
    ],
  },
  {
    title: "INDXR.AI's Focus",
    description: "INDXR.AI is built specifically for YouTube transcript extraction. Get transcripts instantly without watching videos. Process playlists in bulk.",
    points: [
      "Instant transcript extraction",
      "No extension needed",
      "Batch playlist processing",
      "Focused on content creation",
    ],
  },
];

const faqs = [
  {
    question: "Why choose INDXR.AI over Tactiq for YouTube?",
    answer: "Tactiq is a meeting transcription tool where YouTube support is secondary. It requires a browser extension and watching videos in real-time. INDXR.AI extracts YouTube transcripts instantly, processes playlists in batch, and works on any device without extensions.",
  },
  {
    question: "Does INDXR.AI transcribe live meetings like Tactiq?",
    answer: "No. INDXR.AI is focused on YouTube transcripts and audio file transcription. For live meeting transcription (Google Meet, Zoom), Tactiq remains a better choice. Use both tools for their respective strengths.",
  },
  {
    question: "Is INDXR.AI free like Tactiq's free tier?",
    answer: "Yes. Both offer free tiers. INDXR.AI's free tier includes unlimited transcript extraction from videos with existing captions, plus monthly credits for AI transcription of videos without captions.",
  },
  {
    question: "Can I use INDXR.AI on my phone?",
    answer: "Yes. Since INDXR.AI is web-based with no extension requirement, it works on any mobile browser. Tactiq's extension-based approach doesn't work on mobile devices.",
  },
];

export default function TactiqAlternativePage() {
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
    "description": "Tactiq alternative for YouTube transcripts. No extension required, works on any device.",
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
              Tactiq Alternative
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Need YouTube transcripts without installing a browser extension? INDXR.AI extracts transcripts instantly from any browser, any device. No installation required.
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
              INDXR.AI vs Tactiq
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4">Feature</th>
                    <th className="text-center py-4 px-4">Tactiq</th>
                    <th className="text-center py-4 px-4 bg-primary/5">INDXR.AI</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="border-b">
                      <td className="py-4 px-4">{row.feature}</td>
                      <td className="text-center py-4 px-4">
                        {row.tactiq ? (
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
              Why Choose INDXR.AI for YouTube Transcripts
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

        {/* Focus Differences Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Different Tools for Different Needs
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {focusDifferences.map((item) => (
                <Card key={item.title} className="border">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground mb-4">{item.description}</p>
                    <ul className="space-y-2">
                      {item.points.map((point) => (
                        <li key={point} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
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
              Ready to Try Extension-Free Transcription?
            </h2>
            <p className="text-muted-foreground mb-8">
              No install. No permissions. Just transcripts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Try INDXR.AI Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-transcript-without-extension">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
