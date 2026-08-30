import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Set a new password — INDXR.AI",
  // A transient, session-bound recovery page — never index it.
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
