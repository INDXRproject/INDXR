"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import { Notice } from "@indxr/shared/components/ui/notice"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { listConnectedApps, disconnectApp, type Connection } from "@/app/actions/connectedApps"

// Connected apps (Gevonden 9-11 B6, ADR-108 fase 2) — read-only AI assistants (Claude, ChatGPT) a
// user has connected via the MCP OAuth flow. Disconnect revokes every token and authorization that
// client ever got for this account; the next call with any of them is a plain 401.

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
}

export function ConnectedAppsCard() {
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listConnectedApps().then(setConnections)
  }, [])

  const handleDisconnect = async (clientId: string) => {
    setError(null)
    setDisconnecting(clientId)
    const { success } = await disconnectApp(clientId)
    setDisconnecting(null)
    if (!success) {
      setError("Couldn't disconnect this app. Please try again.")
      return
    }
    setConnections((prev) => prev?.filter((c) => c.client_id !== clientId) ?? null)
  }

  return (
    <Card className="rounded-none border-2 border-border-strong bg-bg shadow-none">
      <CardHeader>
        <CardTitle className="font-bold text-fg-strong">Connected apps</CardTitle>
        <CardDescription className="text-fg">
          AI assistants (Claude, ChatGPT) you've connected to read your library — search, transcripts,
          sources and summaries. Read-only: they can't change or delete anything, or spend credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice>}

        {connections === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : connections.length === 0 ? (
          <Notice tone="info">
            No AI assistants connected.{" "}
            <a href={marketingHref("/docs/guides/ai-assistants")} className="font-medium text-link underline underline-offset-2 hover:text-link-hover">
              Learn how to connect one
            </a>
            .
          </Notice>
        ) : (
          <div className="divide-y divide-border-subtle border-2 border-border-strong">
            {connections.map((c) => (
              <div key={c.client_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-fg-strong">{c.name}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    Returns to: {c.redirect_host} · Connected {formatDate(c.connected_at)}
                    {c.last_used_at ? ` · Last used ${formatDate(c.last_used_at)}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disconnecting === c.client_id}
                  onClick={() => handleDisconnect(c.client_id)}
                  className="shrink-0"
                >
                  {disconnecting === c.client_id ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
