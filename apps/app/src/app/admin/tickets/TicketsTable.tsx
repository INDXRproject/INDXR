"use client"

import { useState } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"

interface Reply {
  id: string
  title: string
  body: string
  sender_role: "admin" | "user"
  created_at: string
}

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
type FilterType = "open" | "closed" | "all"

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

interface Props {
  initialTickets: Ticket[]
  initialRepliesByTicket: Record<string, Reply[]>
}

export function TicketsTable({ initialTickets, initialRepliesByTicket }: Props) {
  const [tickets, setTickets]               = useState<Ticket[]>(initialTickets)
  const [repliesByTicket, setRepliesByTicket] = useState<Record<string, Reply[]>>(initialRepliesByTicket)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [activeAction, setActiveAction]     = useState<ActionType | null>(null)
  const [loading, setLoading]               = useState(false)
  const [notice, setNotice]                 = useState<{ msg: string; ok: boolean } | null>(null)
  const [replyTitle, setReplyTitle]         = useState("")
  const [replyBody, setReplyBody]           = useState("")
  const [creditAmt, setCreditAmt]           = useState("")
  const [creditReason, setCreditReason]     = useState("")
  const [filter, setFilter]                 = useState<FilterType>("open")

  const openCount   = tickets.filter((t) => t.status === "open").length
  const closedCount = tickets.filter((t) => t.status === "closed").length

  const visibleRaw = filter === "open"   ? tickets.filter((t) => t.status === "open")
                   : filter === "closed" ? tickets.filter((t) => t.status === "closed")
                   : tickets
  // Open queue: oldest first (werkvoorraad-volgorde)
  const visible = filter === "open"
    ? [...visibleRaw].sort((a, b) => a.created_at.localeCompare(b.created_at))
    : visibleRaw

  const showNotice = (msg: string, ok = true) => setNotice({ msg, ok })

  const resetForms = () => {
    setReplyTitle(""); setReplyBody(""); setCreditAmt(""); setCreditReason("")
  }

  const toggleTicket = (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null)
      setActiveAction(null)
      resetForms()
    } else {
      setExpandedTicket(ticketId)
      setActiveAction(null)
      resetForms()
    }
  }

  const toggleAction = (action: ActionType) => {
    setActiveAction((prev) => (prev === action ? null : action))
    resetForms()
  }

  const closeTicket = async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/tickets/${id}/close`, { method: "POST" })
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "closed" as const } : t))
      setActiveAction(null)
      showNotice("Ticket closed.")
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
      // Optimistic: add reply to thread so admin sees it immediately
      const newReply: Reply = {
        id:          crypto.randomUUID(),
        title:       replyTitle.trim(),
        body:        replyBody.trim(),
        sender_role: "admin",
        created_at:  new Date().toISOString(),
      }
      setRepliesByTicket((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), newReply],
      }))
      setActiveAction(null)
      resetForms()
      showNotice("Reply sent to user.")
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
      setActiveAction(null)
      resetForms()
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
      {/* Inline persistent notice */}
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

      {/* 3-state filter */}
      <div className="flex gap-1">
        {(["open", "closed", "all"] as const).map((f) => {
          const label = f === "open"   ? `Open (${openCount})`
                      : f === "closed" ? `Closed (${closedCount})`
                      : `All (${tickets.length})`
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors",
                filter === f
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border text-fg-muted hover:text-fg"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-fg-muted py-4 text-center">
          {filter === "open" ? "No open tickets." : filter === "closed" ? "No closed tickets." : "No tickets."}
        </p>
      )}

      {visible.map((ticket) => {
        const isExpanded = expandedTicket === ticket.id
        const replies    = repliesByTicket[ticket.id] ?? []

        return (
          <div key={ticket.id} className="rounded-lg border border-border bg-surface overflow-hidden">
            {/* Clickable row — opens thread */}
            <button
              onClick={() => toggleTicket(ticket.id)}
              className="w-full text-left grid grid-cols-[6rem_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm hover:bg-surface-elevated transition-colors"
            >
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

              <span className="flex items-center gap-1 text-xs text-fg-muted shrink-0">
                {replies.length + 1} msg{replies.length + 1 !== 1 ? "s" : ""}
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </span>
            </button>

            {/* Thread view */}
            {isExpanded && (
              <div className="border-t border-border">
                {/* Original ticket body */}
                <div className="px-4 py-3 bg-bg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-fg">{ticket.user_email ?? "User"}</span>
                    <span className="text-xs text-fg-muted">{fmtDate(ticket.created_at)}</span>
                  </div>
                  <p className="text-sm text-fg whitespace-pre-line break-words">{ticket.body}</p>
                </div>

                {/* Thread messages chronological ascending (already sorted from server) */}
                {replies.map((reply) => {
                  const isUser = reply.sender_role === "user"
                  return (
                    <div
                      key={reply.id}
                      className={cn("px-4 py-3 border-t border-border/50", isUser ? "bg-bg" : "bg-surface")}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("text-xs font-semibold", isUser ? "text-fg" : "text-accent")}>
                          {isUser ? (ticket.user_email ?? "User") : "INDXR Support"}
                        </span>
                        <span className="text-xs text-fg-muted">{fmtDate(reply.created_at)}</span>
                      </div>
                      <p className="text-sm text-fg whitespace-pre-line break-words">{reply.body}</p>
                    </div>
                  )
                })}

                {/* Action bar */}
                <div className="px-4 py-2.5 border-t border-border/50 bg-surface-elevated flex items-center gap-2 flex-wrap">
                  {ticket.status === "open" && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => toggleAction("close")}
                      className={cn("text-xs h-7 px-2", activeAction === "close" && "bg-surface")}
                    >
                      Close
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => toggleAction("reply")}
                    className={cn("text-xs h-7 px-2", activeAction === "reply" && "bg-surface")}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => toggleAction("credits")}
                    className={cn("text-xs h-7 px-2", activeAction === "credits" && "bg-surface")}
                  >
                    Credits
                  </Button>
                </div>

                {/* Action form panels */}
                {activeAction === "close" && (
                  <div className="px-4 py-3 border-t border-border/50 bg-bg flex gap-2">
                    <Button size="sm" disabled={loading} onClick={() => closeTicket(ticket.id)}>
                      Confirm close
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setActiveAction(null); resetForms() }}>
                      Cancel
                    </Button>
                  </div>
                )}

                {activeAction === "reply" && (
                  <div className="px-4 py-3 border-t border-border/50 bg-bg space-y-2">
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
                      <Button
                        size="sm"
                        disabled={loading || !replyTitle.trim() || !replyBody.trim()}
                        onClick={() => sendReply(ticket.id)}
                      >
                        Send reply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActiveAction(null); resetForms() }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {activeAction === "credits" && (
                  <div className="px-4 py-3 border-t border-border/50 bg-bg space-y-2">
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
                      <Button size="sm" variant="ghost" onClick={() => { setActiveAction(null); resetForms() }}>
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
