import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube Transcript FAQ — INDXR.AI",
  description:
    "Answers to common questions about downloading YouTube transcripts, extracting subtitles as SRT files, transcribing playlists in bulk, and using AI to transcribe videos without captions.",
  openGraph: {
    title: "YouTube Transcript FAQ — INDXR.AI",
    description:
      "Answers to common questions about downloading YouTube transcripts, extracting subtitles, and AI transcription.",
    type: "website",
    url: "https://indxr.ai/faq",
  },
};

type FAQ = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  faqs: FAQ[];
};

const faqCategories: FAQCategory[] = [
  {
    title: "General",
    faqs: [
      {
        question: "What is INDXR.AI and what can I use it for?",
        answer:
          "INDXR.AI is a web-based tool for extracting transcripts from YouTube videos. You can use it to download captions as text files, generate subtitles in SRT or VTT format, process entire playlists at once, and transcribe videos that don't have captions using Whisper AI. Content creators use it to repurpose video content into blog posts. Researchers use it to analyze interview data. Students use it to create study notes from lecture videos. Visit our <a href='/youtube-transcript-downloader'>transcript downloader</a> to get started.",
      },
      {
        question: "Does INDXR.AI work without installing a Chrome extension?",
        answer:
          "Yes, INDXR.AI is 100% web-based. You don't need to install any browser extension, plugin, or software. Just open the website in any browser (Chrome, Firefox, Safari, Edge, or mobile browsers) and paste a YouTube URL. This makes it more private than extension-based tools that require access to your browsing data. Learn more about our <a href='/youtube-transcript-without-extension'>extension-free approach</a>.",
      },
      {
        question: "What is the best YouTube transcript tool without a Chrome extension?",
        answer:
          "INDXR.AI is designed specifically as an extension-free alternative. Unlike tools like Tactiq or other Chrome extensions, INDXR.AI runs entirely in your browser without installation. This means it works on any device including iPhones and Android phones where extensions aren't available. It also means no permission requests for your browsing history. Compare us to other tools on our <a href='/alternative/tactiq'>Tactiq alternative</a> page.",
      },
      {
        question: "Do I need to create an account to use INDXR.AI?",
        answer:
          "No account is required for basic transcript extraction from single videos. You can paste a URL, extract the transcript, and download it immediately. However, creating a free account unlocks additional features: playlist extraction (50 videos per month), a personal transcript library to save and organize your transcripts, and access to AI summarization. Account creation takes 30 seconds with email or Google sign-in.",
      },
      {
        question: "Can I use transcripts I download for commercial purposes?",
        answer:
          "Yes, you can use transcripts for any purpose including commercial projects. However, the content of the transcript belongs to the original video creator. INDXR.AI only extracts publicly available captions—we don't grant rights to the underlying content. If you're repurposing someone else's video content, ensure you have appropriate permissions or that your use falls under fair use guidelines in your jurisdiction.",
      },
    ],
  },
  {
    title: "YouTube Transcripts",
    faqs: [
      {
        question: "How do I download a YouTube transcript as a text file?",
        answer:
          "Go to the <a href='/dashboard'>INDXR.AI dashboard</a>, paste the YouTube video URL into the input field, and click Extract. Once the transcript loads, click the Export button and select TXT format. You can choose to include timestamps or export clean text without them. The file downloads instantly to your computer. For videos without existing captions, you can use our Whisper AI feature to generate a transcript from the audio.",
      },
      {
        question: "Can I get a transcript from a YouTube video without captions?",
        answer:
          "Yes, using our Whisper AI transcription feature. When a video doesn't have captions, INDXR.AI extracts the audio and sends it to OpenAI's Whisper model for speech-to-text conversion. Whisper supports 99 languages and produces highly accurate transcripts even for videos with accents or background noise. This feature uses credits (1 credit per 10 minutes of audio). Learn more about <a href='/audio-to-text'>AI transcription</a>.",
      },
      {
        question: "How do I transcribe an entire YouTube playlist at once?",
        answer:
          "Use the Playlist tab in the dashboard. Paste the playlist URL (the one containing 'list=' in the address), and INDXR.AI will scan all videos. You'll see which videos have captions available and which would need AI transcription. Select the videos you want, then click Extract All. Transcripts are processed in parallel and saved to your library. Free users get 50 playlist videos per month. See our <a href='/youtube-playlist-transcript'>playlist extraction guide</a> for details.",
      },
      {
        question: "Is there a way to bulk download transcripts from a YouTube playlist?",
        answer:
          "Yes, INDXR.AI supports bulk extraction from playlists of any size. After extracting a playlist, all transcripts are saved to your library. You can then select multiple transcripts and export them as individual files or as a single ZIP archive. Each transcript can be exported in your preferred format (TXT, SRT, VTT, JSON). Visit <a href='/bulk-youtube-transcript'>bulk download</a> to learn more about batch processing options.",
      },
      {
        question: "How to transcribe a YouTube video in another language?",
        answer:
          "If the video has captions in another language, INDXR.AI extracts them automatically—no configuration needed. For videos without captions, our Whisper AI transcription automatically detects the spoken language from the audio. Whisper supports 99 languages including Spanish, French, German, Chinese, Japanese, Arabic, Portuguese, and many more. The transcript will be in the language spoken in the video; we don't currently offer translation services.",
      },
      {
        question: "Can I download YouTube subtitles in SRT format?",
        answer:
          "Yes. After extracting a transcript, click Export and select SRT from the format dropdown. SRT (SubRip Subtitle) is the industry-standard format supported by video editors like Premiere Pro, Final Cut, and DaVinci Resolve. The exported file includes sequence numbers and precise timestamps in HH:MM:SS,mmm format. See our <a href='/youtube-srt-download'>SRT download guide</a> for more information about subtitle formats.",
      },
      {
        question: "What is a VTT file and how do I get one from YouTube?",
        answer:
          "VTT (WebVTT) is a subtitle format designed for web video players. It's similar to SRT but uses a slightly different timestamp format and supports additional styling options. To get a VTT file, extract any YouTube transcript with INDXR.AI, then choose VTT from the export menu. VTT files are commonly used with HTML5 video elements and streaming platforms. Both SRT and VTT contain the same timing and text data.",
      },
      {
        question: "Can I export transcripts to SRT for subtitles?",
        answer:
          "Yes, SRT export is available for all transcripts. The exported SRT file maintains the original timing from YouTube's captions, so subtitles will sync correctly when imported into video editing software. If you used Whisper AI transcription, the timestamps are generated during the speech recognition process. Export options are available after extraction in the transcript viewer. Visit <a href='/youtube-srt-download'>SRT downloads</a> for more details.",
      },
    ],
  },
  {
    title: "Pricing & Credits",
    faqs: [
      {
        question: "How much does it cost to transcribe a YouTube video?",
        answer:
          "Extracting transcripts from videos with existing YouTube captions is completely free with no limits. For videos without captions, our Whisper AI transcription costs 1 credit per 10 minutes of audio. Credits can be purchased in packages: 10 credits for €5, 30 credits for €12, or 100 credits for €35. A 60-minute video without captions would cost 6 credits (approximately €3). Check our <a href='/pricing'>pricing page</a> for current packages.",
      },
      {
        question: "Is there a free tier? What's included?",
        answer:
          "Yes, INDXR.AI offers a generous free tier. Free users get: unlimited transcript extraction from videos with existing captions, 50 playlist video extractions per month, 3 free Whisper AI credits to try AI transcription, access to all export formats (TXT, SRT, VTT, JSON, CSV), and a personal transcript library. The only features that require payment are additional Whisper credits and AI summarization beyond the free trial.",
      },
      {
        question: "Do my credits expire?",
        answer:
          "No, purchased credits never expire. Once you buy a credit package, those credits remain in your account until you use them. This makes INDXR.AI ideal for occasional users who might go months between projects. Your credit balance is always visible in the dashboard. We don't believe in expiring credits or forcing users into monthly subscriptions they don't need.",
      },
      {
        question: "How does the credit system work?",
        answer:
          "Credits are the currency for premium features. Whisper AI transcription uses 1 credit per minute of audio (rounded up). AI summarization uses 3 credits per summary. Playlist extraction beyond your 50 free monthly videos uses 1 credit per 10 additional videos. Your credit balance is shown in the dashboard, and you'll always see the cost before confirming any action. View packages on our <a href='/pricing'>pricing page</a>.",
      },
    ],
  },
  {
    title: "Technical",
    faqs: [
      {
        question: "Can I use AI to transcribe YouTube videos without subtitles?",
        answer:
          "Yes, our Whisper AI feature handles videos without captions. When you attempt to extract a transcript from a video that lacks captions, INDXR.AI offers to transcribe the audio using OpenAI's Whisper model. The process downloads the audio, sends it to Whisper for speech recognition, and returns a timestamped transcript. Whisper is one of the most accurate speech-to-text models available, supporting 99 languages with strong performance on accents and technical vocabulary.",
      },
      {
        question: "How accurate is the Whisper AI transcription?",
        answer:
          "Whisper AI achieves approximately 95% word accuracy for clear speech in supported languages. Accuracy can vary based on audio quality, background noise, speaker accents, and technical terminology. For comparison, YouTube's auto-generated captions typically achieve 70-90% accuracy. Whisper performs particularly well on conversational speech and can handle multiple speakers. For the best results, ensure the source video has clear audio without heavy background music.",
      },
      {
        question: "What audio file formats can I upload?",
        answer:
          "INDXR.AI accepts most common audio formats: MP3, WAV, M4A, FLAC, OGG, and WebM. Files up to 100MB can be uploaded directly through the <a href='/audio-to-text'>audio transcription</a> interface. For larger files, we recommend splitting them into segments or compressing to a lower bitrate. The audio is processed by Whisper AI and returns a timestamped transcript that can be exported in any format.",
      },
      {
        question: "What export formats are available?",
        answer:
          "INDXR.AI supports six export formats: TXT with timestamps (shows time codes), TXT without timestamps (clean reading text), SRT (subtitle format for video editors), VTT (web subtitle format), CSV (spreadsheet-compatible with timestamp columns), and JSON (structured data for developers). All formats are available for both YouTube caption extraction and Whisper AI transcription. Choose based on your intended use case.",
      },
      {
        question: "How long does transcript extraction take?",
        answer:
          "For videos with existing YouTube captions, extraction is nearly instant (1-3 seconds). For Whisper AI transcription, processing time depends on video length—roughly 10 seconds of processing per minute of audio. A 10-minute video takes about 1.5-2 minutes to transcribe. Playlist extraction processes multiple videos in parallel, so a 50-video playlist completes faster than processing each video sequentially.",
      },
    ],
  },
];

// Flatten all FAQs for JSON-LD schema
const allFaqs = faqCategories.flatMap((category) => category.faqs);

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.replace(/<[^>]*>/g, ""), // Strip HTML for schema
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-20 px-4 border-b">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about extracting YouTube transcripts,
              downloading subtitles, and using AI transcription.
            </p>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            {faqCategories.map((category) => (
              <div key={category.title} className="mb-12">
                <h2 className="text-2xl font-bold mb-6 pb-2 border-b">
                  {category.title}
                </h2>
                <div className="space-y-4">
                  {category.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group border rounded-lg bg-card"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-muted/50 rounded-lg transition-colors">
                        <span className="pr-4">{faq.question}</span>
                        <span className="flex-shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pt-2 text-muted-foreground leading-relaxed">
                        <p
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                          className="[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80"
                        />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}

            {/* CTA Section */}
            <div className="mt-16 text-center p-8 rounded-lg bg-muted/30 border">
              <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
              <p className="text-muted-foreground mb-6">
                Contact our support team or try the transcript extractor for
                free.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Try It Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/support">Contact Support</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
