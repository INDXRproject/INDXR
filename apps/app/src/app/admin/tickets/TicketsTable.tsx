"use client"

import { useState } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"

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

export function TicketsTable({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets]       = useState<Ticket[]>(initialTickets)
  const [active, setActive]         = useState<Active | null>(null)
  const [loading, setLoading]       = useState(false)
  const [feedback, setFeedback]     = useState<string | null>(null)
  const [replyTitle, setReplyTitle] = useState("")
  const [replyBody, setReplyBody]   = useState("")
  const [creditAmt, setCreditAmt]   = useState("")
  const [creditReason, setCreditReason] = useState("")

  const resetForms = () => {
    setReplyTitle(""); setReplyBody(""); setCreditAmt(""); setCreditReason(""); setFeedback(null)
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
      setActive(null); setFeedback("Ticket closed.")
    } else {
      setFeedback("Failed to close ticket.")
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
      setActive(null); resetForms(); setFeedback("Reply sent.")
    } else {
      setFeedback("Failed to send reply.")
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
      setActive(null); resetForms(); setFeedback(`${amount} credit(s) added to ${ticket.user_email ?? ticket.user_id}.`)
    } else {
      setFeedback("Failed to add credits.")
    }
    setLoading(false)
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })

  if (tickets.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">No tickets yet.</p>
  }

  return (
    <div className="space-y-1">
      {feedback && <p className="text-sm text-fg-muted mb-3 px-1">{feedback}</p>}

      {tickets.map((ticket) => {
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

              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                ticket.category === "bug"      && "bg-error/10 text-error",
                ticket.category === "billing"  && "bg-warning/10 text-warning",
                ticket.category === "feedback" && "bg-accent-subtle text-accent",
              )}>
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
                <p className="text-xs text-fg-muted whitespace-pre-line line-clamp-4">{ticket.body}</p>

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
