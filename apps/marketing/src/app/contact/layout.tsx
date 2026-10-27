import type { Metadata } from "next"
import { pageOg } from "@/lib/pageOg"

// page.tsx is a client component ("use client") — metadata can't be exported from a client
// component, so it lives here instead (same pattern as transcribe/layout.tsx).
const title = "Contact — INDXR.AI"
const description = "Feedback, a bug report, or a general question about INDXR — tell us what's on your mind, we read and reply to everything."

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title,
  description,
  ...pageOg("/contact"),
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
