"use client"

import { useAuth } from "@indxr/shared/hooks/useAuth"

/**
 * Live credit balance for the Home page. Uses the same source as the
 * topbar/sidebar (useAuth().credits → get_user_credits → user_credits.credits)
 * so the number stays consistent and refreshes within a session, instead of a
 * one-shot server render against a non-existent RPC.
 */
export function HomeCreditsBalance() {
  const { credits } = useAuth()
  return <p className="text-4xl font-semibold text-fg tabular-nums">{credits ?? 0}</p>
}
