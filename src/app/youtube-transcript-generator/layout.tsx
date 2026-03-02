import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "YouTube Transcript Generator - Free & Premium | INDXR.AI",
  description: "Generate accurate YouTube transcripts instantly. Free auto-captions or premium AI-powered transcription. Export to TXT, JSON, CSV, SRT, VTT formats.",
  keywords: ["youtube transcript generator", "youtube transcript", "youtube captions", "transcript download", "youtube subtitle download", "video transcript", "youtube to text"],
  openGraph: {
    title: "YouTube Transcript Generator - Free & Premium | INDXR.AI",
    description: "Generate accurate YouTube transcripts instantly. Free auto-captions or premium AI-powered transcription.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Transcript Generator - Free & Premium | INDXR.AI",
    description: "Generate accurate YouTube transcripts instantly. Export to multiple formats.",
  },
}

export default function TranscriptGeneratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
