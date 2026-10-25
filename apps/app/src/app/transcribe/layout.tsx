import { Metadata } from "next"

// growth-plan.md §6.3 H6: this public page previously inherited the root layout's generic
// "INDXR.AI - Dashboard" title (apps/app/src/app/transcribe/page.tsx is a client component, which
// can't export metadata itself — a sibling layout.tsx is the standard App Router fix).
export const metadata: Metadata = {
  title: "Transcribe a file — INDXR.AI",
}

export default function TranscribeLayout({ children }: { children: React.ReactNode }) {
  return children
}
