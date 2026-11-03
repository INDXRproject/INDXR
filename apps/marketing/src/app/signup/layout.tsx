import type { Metadata } from "next"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/signup" },
  // Auth page: not a search landing page and deliberately not in the sitemap (sitemap.ts), so
  // noindex keeps Google consistent with that (Ahrefs 2026-11-03: "indexable page not in sitemap").
  robots: { index: false, follow: true },
  // 30-60 char budget (Ahrefs crawl 2026-10-27: had no title of its own, inherited the homepage
  // title via the root layout).
  title: "Sign up for INDXR.AI — transcribe audio, video and YouTube",
  ...pageOg("/signup"),
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
