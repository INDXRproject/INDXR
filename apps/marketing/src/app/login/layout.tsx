import type { Metadata } from "next"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  ...pageOg("/login"),
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
