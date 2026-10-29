"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@indxr/shared/contexts/AuthContext"

// Renders nothing — purely a background effect, so it never gates the balie's first paint (see
// page.tsx). Logged-in visitors who land here (rare: this is an ad-landing URL, not a workspace
// link) still end up on /dashboard/transcribe, just via a client-side redirect after hydration
// instead of a blocking server/client auth-check.
export function RedirectIfLoggedIn() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/transcribe")
    }
  }, [loading, user, router])

  return null
}
