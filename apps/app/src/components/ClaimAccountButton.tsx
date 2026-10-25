"use client"

import { useState } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { Loader2, CheckCircle2 } from "lucide-react"

// H9 (growth-plan.md §6.3): "met één klik een account claimen" op de secure transcript-pagina.
// The guest account already exists (admin.createUser at checkout, no password) — claiming means
// setting a password via the standard recovery-link flow, same as "forgot password". After a
// successful password update, reset-password/page.tsx also flips profiles.is_guest to false.
export function ClaimAccountButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  async function claim() {
    setStatus("sending")
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: marketingHref("/auth/callback?recovery=1"),
      })
      setStatus(error ? "error" : "sent")
    } catch {
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-success flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4" /> Check {email} for a link to set your password.
      </p>
    )
  }

  return (
    <div>
      <Button onClick={claim} disabled={status === "sending"} size="sm">
        {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim this account"}
      </Button>
      {status === "error" && (
        <p className="text-xs text-error mt-2">Could not send the claim link. Try again.</p>
      )}
    </div>
  )
}
