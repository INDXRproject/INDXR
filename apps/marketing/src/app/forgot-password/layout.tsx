import type { Metadata } from "next"

// Auth page: not a search landing page and not in the sitemap, so noindex (Ahrefs 2026-11-03:
// "indexable page not in sitemap" + "only one incoming internal link").
export const metadata: Metadata = {
  title: "Reset your password — INDXR.AI",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
