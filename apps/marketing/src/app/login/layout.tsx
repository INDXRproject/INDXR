import type { Metadata } from "next"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  title: "Log in — INDXR.AI",
  // Auth page: not a search landing page and deliberately not in the sitemap (sitemap.ts), so
  // noindex keeps Google consistent with that (Ahrefs 2026-11-03: "indexable page not in sitemap").
  robots: { index: false, follow: true },
  ...pageOg("/login"),
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
