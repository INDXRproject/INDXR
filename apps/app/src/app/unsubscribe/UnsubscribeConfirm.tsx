"use client"

import { useState } from "react"
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
      <p className="text-sm text-fg-muted">
        You&apos;ve been unsubscribed from INDXR.AI broadcast emails. You&apos;ll still
        receive replies to your own support tickets.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Stop receiving marketing &amp; announcement emails from INDXR.AI? This does not
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
