import type { Metadata } from "next"

const title = "Transcript generator — audio, video & YouTube | INDXR.AI"
// 155-char budget (Ahrefs crawl 2026-10-27: was 196 chars). Keyword first, no "first 3 minutes
// free" promise (the preview is capped at min(3 min, 1/3 duration) — see QuickCheckoutPanel).
const description =
  "Upload audio, video, or a YouTube link and get an accurate transcript — free captions or AI transcription, exportable as TXT, SRT, VTT, JSON and more."

export const metadata: Metadata = {
  alternates: { canonical: "/transcribe" },
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://indxr.ai/transcribe",
    type: "website",
    images: [{ url: "https://indxr.ai/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://indxr.ai/og-default.jpg"],
  },
}

export default function TranscriptGeneratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
