"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/Header"

export function ConditionalHeader() {
  const pathname = usePathname()
  // Don't render the marketing header on dashboard pages
  if (pathname?.startsWith("/dashboard")) return null
  return <Header />
}
