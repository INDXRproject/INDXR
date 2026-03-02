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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800"
    >
      <Coins className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium text-white">{credits}</span>
      <span className="text-xs text-zinc-400">credits</span>
    </Link>
  )
}
