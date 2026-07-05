"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { Label } from "@indxr/shared/components/ui/label"
import { Switch } from "@indxr/shared/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@indxr/shared/components/ui/alert-dialog"

type Target = "all" | "paid" | "free" | "manual"
type MessageType = "marketing" | "service"
interface UserHit { id: string; email: string }
interface SendResult {
  recipients: number
  inApp: number
  email: { requested: boolean; sent: number; failed: number; skippedUnsubscribed: number }
}

const TARGET_LABELS: Record<Target, string> = {
  all: "All users",
  paid: "Paid users",
  free: "Free users",
  manual: "Specific users",
}

export function BroadcastComposer() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [target, setTarget] = useState<Target>("manual")
  const [messageType, setMessageType] = useState<MessageType>("marketing")
  const [manual, setManual] = useState<UserHit[]>([])
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<UserHit[]>([])
  const [sendEmail, setSendEmail] = useState(false)

  const [count, setCount] = useState<number | null>(null)
  const [withEmail, setWithEmail] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const manualIds = manual.map((u) => u.id)
  const manualKey = manualIds.join(",")

  // ── Recipient count preview ────────────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    if (target === "manual" && manual.length === 0) {
      setCount(0); setWithEmail(0); return
    }
    setCountLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/broadcast/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, manualIds }),
      })
      const data = await res.json()
      if (res.ok) { setCount(data.count); setWithEmail(data.withEmail) }
      else { setCount(null); setError(data.error ?? "Failed to load count") }
    } catch {
      setCount(null); setError("Failed to load count")
    } finally {
      setCountLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, manualKey])

  useEffect(() => { fetchCount() }, [fetchCount])

  // ── Manual user search ─────────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (target !== "manual") return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (search.trim().length < 2) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/broadcast/search-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: search }),
        })
        const data = await res.json()
        if (res.ok) setResults(data.users ?? [])
      } catch { /* ignore */ }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, target])

  const addUser = (u: UserHit) => {
    if (!manual.some((m) => m.id === u.id)) setManual((prev) => [...prev, u])
    setSearch(""); setResults([])
  }
  const removeUser = (id: string) => setManual((prev) => prev.filter((m) => m.id !== id))

  const canSend = title.trim() && body.trim() && count != null && count > 0 && !sending

  // ── Send (after explicit confirmation) ─────────────────────────────────────
  const doSend = async () => {
    if (count == null) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, target, manualIds, sendEmail, messageType, confirmCount: count }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        setTitle(""); setBody(""); setManual([]); setSendEmail(false)
      } else {
        setError(data.error ?? "Send failed")
      }
    } catch {
      setError("Send failed")
    } finally {
      setSending(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {result && (
        <div className="rounded-lg border border-success/30 bg-success-subtle p-4 text-sm space-y-1">
          <p className="font-semibold text-success-fg">Broadcast sent</p>
          <p className="text-fg-muted">
            In-app: {result.inApp} message{result.inApp !== 1 ? "s" : ""} delivered.
            {result.email.requested
              ? ` Email: ${result.email.sent} sent, ${result.email.failed} failed, ${result.email.skippedUnsubscribed} skipped (unsubscribed).`
              : " Email not sent."}
          </p>
        </div>
      )}

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="bc-title">Title</Label>
        <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bc-body">Message</Label>
        <textarea
          id="bc-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Your message to users…"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        />
      </div>

      {/* Audience */}
      <div className="space-y-2">
        <Label>Audience</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TARGET_LABELS) as Target[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                target === t ? "border-accent bg-accent-subtle text-fg" : "border-border hover:bg-surface-elevated text-fg-muted"
              }`}
            >
              {TARGET_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Message type — drives the unsubscribe machinery */}
      <div className="space-y-2">
        <Label>Message type</Label>
        <div className="flex flex-wrap gap-2">
          {(["marketing", "service"] as MessageType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMessageType(t)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors capitalize ${
                messageType === t ? "border-accent bg-accent-subtle text-fg" : "border-border hover:bg-surface-elevated text-fg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {messageType === "service" ? (
          <p className="text-xs text-warning-fg">
            Service messages (outages, account notices) go to <strong>all</strong> users regardless of
            marketing preference and carry no unsubscribe footer. They must contain <strong>no</strong>{" "}
            promotional content — promotion in a service email makes it marketing.
          </p>
        ) : (
          <p className="text-xs text-fg-muted">
            Marketing emails honour unsubscribes and include an unsubscribe footer.
          </p>
        )}
      </div>

      {/* Manual selection */}
      {target === "manual" && (
        <div className="space-y-2">
          <Label htmlFor="bc-search">Search users by email</Label>
          <Input id="bc-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type at least 2 characters…" />
          {results.length > 0 && (
            <div className="rounded-md border border-border divide-y divide-border-subtle max-h-52 overflow-y-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addUser(u)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-elevated"
                >
                  {u.email}
                </button>
              ))}
            </div>
          )}
          {manual.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {manual.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-border px-2 py-0.5 text-xs">
                  {u.email}
                  <button type="button" onClick={() => removeUser(u.id)} className="text-fg-muted hover:text-fg">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Count preview */}
      <div className="rounded-lg border border-border bg-surface p-4 text-sm">
        {countLoading ? (
          <span className="text-fg-muted">Counting recipients…</span>
        ) : count != null ? (
          <span className="text-fg">
            This message goes to <strong>{count.toLocaleString()}</strong> user{count !== 1 ? "s" : ""}
            {sendEmail && withEmail != null ? ` · ${withEmail.toLocaleString()} have an email address` : ""}.
          </span>
        ) : (
          <span className="text-fg-muted">Select an audience to preview the recipient count.</span>
        )}
      </div>

      {/* Email toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-fg">Also send by email</p>
          <p className="text-xs text-fg-muted">Off by default. Honours marketing unsubscribes; support replies are unaffected.</p>
        </div>
        <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button disabled={!canSend} onClick={() => setConfirmOpen(true)}>
        Review &amp; send
      </Button>

      {/* Explicit confirmation step — no send on a single click */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this broadcast?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-fg-muted">
                <p>
                  This will deliver an in-app message to <strong>{count?.toLocaleString()}</strong>{" "}
                  {TARGET_LABELS[target].toLowerCase()}
                  {target === "manual" ? "" : ""}.
                </p>
                <p>
                  {sendEmail
                    ? `It will ALSO be emailed (skipping anyone who unsubscribed). This can reach up to ${withEmail?.toLocaleString() ?? count?.toLocaleString()} inboxes.`
                    : "Email is OFF — in-app only."}
                </p>
                <p className="text-warning-fg">This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doSend() }} disabled={sending}>
              {sending ? "Sending…" : `Send to ${count?.toLocaleString()}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
