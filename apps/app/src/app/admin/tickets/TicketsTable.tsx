"use client"

import { useState } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { CheckCircle } from "lucide-react"

interface Ticket {
  id: string
  user_id: string
  user_email: string | null
  category: "feedback" | "billing" | "bug"
  subject: string
  body: string
  status: "open" | "closed"
  created_at: string
}

type ActionType = "close" | "reply" | "credits"

interface Active {
  ticketId: string
  action: ActionType
}

const CATEGORY_STYLES: Record<string, string> = {
  bug:      "bg-error/10 text-error",
  billing:  "bg-warning/10 text-warning",
  feedback: "bg-success/10 text-success",
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString("en-US", sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" })
}

export function TicketsTable({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets]       = useState<Ticket[]>(initialTickets)
  const [active, setActive]         = useState<Active | null>(null)
  const [loading, setLoading]       = useState(false)
  const [notice, setNotice]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [replyTitle, setReplyTitle] = useState("")
  const [replyBody, setReplyBody]   = useState("")
  const [creditAmt, setCreditAmt]   = useState("")
  const [creditReason, setCreditReason] = useState("")
  // Filter: "open" shows only open tickets; "all" shows all
  const [filter, setFilter]         = useState<"open" | "all">("open")

  const openCount   = tickets.filter((t) => t.status === "open").length
  const closedCount = tickets.filter((t) => t.status === "closed").length
  const visible     = filter === "open" ? tickets.filter((t) => t.status === "open") : tickets

  const showNotice = (msg: string, ok = true) => setNotice({ msg, ok })

  const resetForms = () => {
    setReplyTitle(""); setReplyBody(""); setCreditAmt(""); setCreditReason("")
  }

  const toggle = (ticketId: string, action: ActionType) => {
    if (active?.ticketId === ticketId && active?.action === action) {
      setActive(null); resetForms()
    } else {
      setActive({ ticketId, action }); resetForms()
    }
  }

  const closeTicket = async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/tickets/${id}/close`, { method: "POST" })
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "closed" as const } : t))
      setActive(null); showNotice("Ticket closed.")
    } else {
      showNotice("Failed to close ticket.", false)
    }
    setLoading(false)
  }

  const sendReply = async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/tickets/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: replyTitle.trim(), body: replyBody.trim() }),
    })
    if (res.ok) {
      setActive(null); resetForms(); showNotice("Reply sent to user.")
    } else {
      showNotice("Failed to send reply.", false)
    }
    setLoading(false)
  }

  const addCredits = async (ticket: Ticket) => {
    const amount = parseInt(creditAmt, 10)
    setLoading(true)
    const res = await fetch("/api/admin/add-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: ticket.user_id, amount, reason: creditReason.trim() }),
    })
    if (res.ok) {
      setActive(null); resetForms()
      showNotice(`${amount} credit(s) added to ${ticket.user_email ?? ticket.user_id}.`)
    } else {
      showNotice("Failed to add credits.", false)
    }
    setLoading(false)
  }

  if (tickets.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">No tickets yet.</p>
  }

  return (
    <div className="space-y-3">
      {/* Inline persistent notice — cleared on next action */}
      {notice && (
        <div className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm",
          notice.ok
            ? "border-success/30 bg-success/10 text-fg"
            : "border-error/30 bg-error/10 text-fg"
        )}>
          <span className="flex items-center gap-2">
            {notice.ok && <CheckCircle className="h-4 w-4 text-success shrink-0" />}
            {notice.msg}
          </span>
          <button onClick={() => setNotice(null)} className="text-fg-muted hover:text-fg transition-colors text-xs shrink-0">✕</button>
        </div>
      )}

      {/* Open/All filter */}
      <div className="flex gap-1">
        <button
          onClick={() => setFilter("open")}
          className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors",
            filter === "open"
              ? "border-accent bg-accent-subtle text-accent"
              : "border-border text-fg-muted hover:text-fg"
          )}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors",
            filter === "all"
              ? "border-accent bg-accent-subtle text-accent"
              : "border-border text-fg-muted hover:text-fg"
          )}
        >
          All ({tickets.length})
          {closedCount > 0 && <span className="ml-1 opacity-60">· {closedCount} closed</span>}
        </button>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-fg-muted py-4 text-center">No open tickets.</p>
      )}

      {visible.map((ticket) => {
        const isRow = active?.ticketId === ticket.id

        return (
          <div key={ticket.id} className="rounded-lg border border-border bg-surface overflow-hidden">
            {/* Row */}
            <div className="grid grid-cols-[6rem_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm">
              <span className="text-xs text-fg-muted shrink-0">{fmtDate(ticket.created_at)}</span>

              <div className="min-w-0">
                <p className="font-medium text-fg truncate">{ticket.subject}</p>
                <p className="text-xs text-fg-muted truncate">{ticket.user_email ?? ticket.user_id}</p>
              </div>

              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", CATEGORY_STYLES[ticket.category])}>
                {ticket.category}
              </span>

              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full shrink-0",
                ticket.status === "open" ? "bg-accent-subtle text-accent" : "bg-surface-elevated text-fg-muted"
              )}>
                {ticket.status}
              </span>

              <div className="flex gap-1 shrink-0">
                {ticket.status === "open" && (
                  <Button size="sm" variant="ghost" onClick={() => toggle(ticket.id, "close")}
                    className={cn("text-xs h-7 px-2", isRow && active?.action === "close" && "bg-surface-elevated")}>
                    Close
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggle(ticket.id, "reply")}
                  className={cn("text-xs h-7 px-2", isRow && active?.action === "reply" && "bg-surface-elevated")}>
                  Reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(ticket.id, "credits")}
                  className={cn("text-xs h-7 px-2", isRow && active?.action === "credits" && "bg-surface-elevated")}>
                  Credits
                </Button>
              </div>
            </div>

            {/* Inline action pane */}
            {isRow && (
              <div className="border-t border-border px-4 py-3 bg-bg space-y-3">
                <p className="text-xs text-fg-muted whitespace-pre-line break-words line-clamp-4">{ticket.body}</p>

                {active.action === "close" && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={loading} onClick={() => closeTicket(ticket.id)}>
                      Confirm close
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setActive(null); resetForms() }}>
                      Cancel
                    </Button>
                  </div>
                )}

                {active.action === "reply" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Message title"
                      value={replyTitle}
                      onChange={(e) => setReplyTitle(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                    <textarea
                      placeholder="Reply body"
                      rows={4}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={loading || !replyTitle.trim() || !replyBody.trim()}
                        onClick={() => sendReply(ticket.id)}>
                        Send reply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActive(null); resetForms() }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {active.action === "credits" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Credits"
                        value={creditAmt}
                        onChange={(e) => setCreditAmt(e.target.value)}
                        className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <input
                        type="text"
                        placeholder="Reason (shown in credit history)"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={loading || !creditAmt || parseInt(creditAmt, 10) < 1 || !creditReason.trim()}
                        onClick={() => addCredits(ticket)}
                      >
                        Add credits
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActive(null); resetForms() }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
