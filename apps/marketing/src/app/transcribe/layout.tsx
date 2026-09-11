import type { Metadata } from "next"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"

const title = "Transcript generator — audio, video & YouTube | INDXR.AI"

export const metadata: Metadata = {
  alternates: { canonical: "/transcribe" },
  title,
  description: `Upload an audio or video file or paste a YouTube link and get an accurate transcript. Free YouTube captions or premium AI transcription. Export to ${exportFormatsProse("and")}.`,
  openGraph: {
    title,
    description: "Upload an audio or video file or paste a YouTube link and get an accurate transcript. Free YouTube captions or premium AI transcription.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Transcribe audio, video and YouTube links. Export to multiple formats.",
  },
}

export default function TranscriptGeneratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
