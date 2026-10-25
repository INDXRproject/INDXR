"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AudioTab } from "@indxr/shared/components/free-tool/AudioTab"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { Loader2 } from "lucide-react"

// Public anonymous entry point for the snelle balie (growth-plan.md §6.2 Onderdeel B: "Bezoeker
// uploadt ... op /transcribe, uploadtab. Er is geen account nodig."). Deliberately OUTSIDE
// /dashboard — middleware.ts gates every /dashboard/* path behind auth, which would make the
// anonymous quick-checkout path in AudioTab (QuickCheckoutPanel) unreachable. Logged-in visitors
// are redirected to the full workspace (/dashboard/transcribe) where their library/credits live.
export default function PublicTranscribePage() {
  const router = useRouter()
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/dashboard/transcribe")
        return
      }
      setCheckedAuth(true)
    })
  }, [router])

  if (!checkedAuth) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg mb-2">Transcribe a file</h1>
      <p className="text-sm text-fg-muted mb-2">
        No account needed — see the price, get a free 3-minute preview, then pay per file.
      </p>
      <AudioTab />
    </div>
  )
}
