import type { Metadata } from "next"
import { exportFormatsProse } from "@indxr/shared/lib/exportFormats"

const title = "YouTube transcript generator — free & premium | INDXR.AI"

export const metadata: Metadata = {
  alternates: { canonical: "/transcribe" },
  title,
  description: `Generate accurate YouTube transcripts instantly. Free YouTube captions or premium AI-powered transcription. Export to ${exportFormatsProse("and")}.`,
  openGraph: {
    title,
    description: "Generate accurate YouTube transcripts instantly. Free YouTube captions or premium AI-powered transcription.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
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
