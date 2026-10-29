"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AudioTab } from "@indxr/shared/components/free-tool/AudioTab"
import { useAuth } from "@indxr/shared/contexts/AuthContext"

// Public anonymous entry point for the snelle balie (growth-plan.md §6.2 Onderdeel B: "Bezoeker
// uploadt ... op /transcribe, uploadtab. Er is geen account nodig."). Deliberately OUTSIDE
// /dashboard — middleware.ts gates every /dashboard/* path behind auth, which would make the
// anonymous quick-checkout path in AudioTab (QuickCheckoutPanel) unreachable. Logged-in visitors
// are redirected to the full workspace (/dashboard/transcribe) where their library/credits live.
//
// Headline/subtext/AudioTab render immediately, unconditionally — no own auth-gate blocking first
// paint. The root layout (apps/app/src/app/layout.tsx) already resolves auth server-side and feeds
// it into AuthContext as `initialUser`, so re-checking it here with a second, client-side
// supabase.auth.getUser() call (growth-plan.md §6.3 mobile-bounce-onderzoek, LOG 2026-10-29) only
// added a redundant blocking tick in front of AudioTab's own (already correct) loading/user
// branching. The rare case of an already-logged-in visitor landing on this ad URL still redirects,
// just as a background effect instead of gating the initial render.
export default function PublicTranscribePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/transcribe")
    }
  }, [loading, user, router])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg mb-2">Transcribe a file</h1>
      <p className="text-sm text-fg-muted mb-2">
        No account needed — see the price, get a free preview of the first part (up to 3 minutes), then pay per file.
      </p>
      <AudioTab />
    </div>
  )
}
