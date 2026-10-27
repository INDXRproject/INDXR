import type { Metadata } from "next"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/signup" },
  // 30-60 char budget (Ahrefs crawl 2026-10-27: had no title of its own, inherited the homepage
  // title via the root layout).
  title: "Sign up for INDXR.AI — transcribe audio, video and YouTube",
  ...pageOg("/signup"),
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
