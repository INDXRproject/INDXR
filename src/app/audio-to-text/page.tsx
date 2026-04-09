import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Upload, Mic, FileAudio, Languages, Clock, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Audio to Text Transcription - Upload & Convert | INDXR.AI",
  description: "Convert audio files to text with Whisper AI. Upload MP3, WAV, M4A, or any audio format. Accurate transcription with timestamps. Download as TXT, SRT, or JSON.",
  openGraph: {
    title: "Audio to Text Transcription | INDXR.AI",
    description: "Convert audio files to text with Whisper AI. Upload MP3, WAV, M4A, or any audio format.",
    type: "website",
    url: "https://indxr.ai/audio-to-text",
  },
};

const features = [
  {
    icon: Upload,
    title: "Drag & Drop Upload",
    description: "Upload audio files directly from your computer. We accept MP3, WAV, M4A, FLAC, OGG, and most common audio formats.",
  },
  {
    icon: Mic,
    title: "Whisper AI Accuracy",
    description: "Powered by OpenAI's Whisper model. State-of-the-art speech recognition that handles accents, background noise, and technical terminology.",
  },
  {
    icon: Languages,
    title: "99 Languages Supported",
    description: "Whisper recognizes and transcribes 99 languages automatically. No need to specify the language — it detects it from the audio.",
  },
  {
    icon: Clock,
    title: "Precise Timestamps",
    description: "Every segment includes start and end timestamps. Export as SRT or VTT for video editing, or JSON for programmatic access.",
  },
];

const supportedFormats = [
  { format: "MP3", description: "Most common audio format" },
  { format: "WAV", description: "Uncompressed audio" },
  { format: "M4A", description: "Apple/iTunes format" },
  { format: "FLAC", description: "Lossless compression" },
  { format: "OGG", description: "Open source format" },
  { format: "WebM", description: "Web audio format" },
];

const useCases = [
  {
    title: "Podcast Transcription",
    description: "Convert podcast episodes to searchable text. Create show notes, blog posts, or audiograms from your recordings.",
  },
  {
    title: "Meeting Notes",
    description: "Upload meeting recordings and get full transcripts. Search for specific topics discussed, extract action items.",
  },
  {
    title: "Interview Transcription",
    description: "Journalists and researchers can transcribe interviews quickly. Timestamps make it easy to find specific quotes.",
  },
  {
    title: "Lecture Capture",
    description: "Students and educators can transcribe lectures for study materials. Create accessible content for all learners.",
  },
];

const faqs = [
  {
    question: "What audio formats are supported?",
    answer: "We support MP3, WAV, M4A, FLAC, OGG, WebM, and most common audio formats. Files up to 100MB can be uploaded directly. For larger files, consider splitting them into segments.",
  },
  {
    question: "How accurate is the transcription?",
    answer: "Whisper AI achieves 95%+ accuracy for clear speech in supported languages. Accuracy may vary with heavy accents, background noise, or multiple overlapping speakers.",
  },
  {
    question: "How much does audio transcription cost?",
    answer: "Audio file transcription uses credits at a rate of 1 credit per 10 minutes of audio. New users receive free credits to start. Additional credits can be purchased as needed.",
  },
  {
    question: "Can I transcribe audio in languages other than English?",
    answer: "Yes. Whisper supports 99 languages and automatically detects the spoken language. You don't need to specify the language before uploading.",
  },
];

export default function AudioToTextPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INDXR.AI Audio Transcription",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
    },
    "description": "Convert audio files to text using Whisper AI. Upload MP3, WAV, M4A and get accurate transcriptions.",
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
              Audio to Text Transcription
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload any audio file and get an accurate transcript powered by Whisper AI. Supports 99 languages, exports to multiple formats.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Upload Audio File</Link>
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
              Audio Transcription Features
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

        {/* Supported Formats Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Supported Audio Formats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {supportedFormats.map((item) => (
                <Card key={item.format} className="border">
                  <CardContent className="p-4 text-center">
                    <FileAudio className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">{item.format}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 border-t">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              How to Transcribe Audio Files
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Upload Your Audio</h3>
                  <p className="text-muted-foreground">Drag and drop your audio file or click to browse. We accept files up to 100MB in any common format.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Whisper AI Processes</h3>
                  <p className="text-muted-foreground">Our servers send the audio to OpenAI's Whisper model. Language is detected automatically. Processing takes roughly 1/10th of the audio duration.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Download Your Transcript</h3>
                  <p className="text-muted-foreground">View the transcript with timestamps, make edits if needed, then export as TXT, SRT, VTT, or JSON.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 px-4 border-t bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Common Use Cases
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase) => (
                <div key={useCase.title}>
                  <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
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
              Ready to Transcribe Your Audio?
            </h2>
            <p className="text-muted-foreground mb-8">
              Upload your first file and see Whisper AI in action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Upload Audio File</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/youtube-transcript-downloader">Or Try YouTube Transcripts</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
