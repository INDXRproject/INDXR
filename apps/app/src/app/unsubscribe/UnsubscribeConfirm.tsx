"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"

type State = "idle" | "loading" | "done" | "error"

export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle")

  const confirm = async () => {
    setState("loading")
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? "done" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle">
          <Check className="h-6 w-6 text-success-fg" />
        </div>
        <p className="text-sm text-fg-muted">
          You&apos;re all set — you won&apos;t receive marketing &amp; product emails from
          INDXR.AI anymore. You&apos;ll still get replies to your own support tickets.
        </p>
        <p className="text-xs text-fg-subtle">
          Changed your mind? You can turn these emails back on any time in your{" "}
          app settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Stop receiving marketing &amp; announcement emails from INDXR.AI? This won&apos;t
        affect replies to your support tickets.
      </p>
      <Button onClick={confirm} disabled={state === "loading"} className="w-full">
        {state === "loading" ? "Unsubscribing…" : "Confirm unsubscribe"}
      </Button>
      {state === "error" && (
        <p className="text-sm text-error">Something went wrong. Please try again.</p>
      )}
    </div>
  )
}
