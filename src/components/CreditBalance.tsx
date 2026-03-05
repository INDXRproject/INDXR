"use client"

import { Coins } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

export function CreditBalance() {
  const { credits, loading } = useAuth()

  // Don't show for anonymous users or while loading
  if (loading || credits === null) {
    return null
  }

  return (
    <Link
      href="/pricing"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors border border-border"
    >
      <Coins className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium text-foreground">{credits}</span>
      <span className="text-xs text-muted-foreground">credits</span>
    </Link>
  )
}
