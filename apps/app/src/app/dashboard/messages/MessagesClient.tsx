"use client"

import { useState } from "react"
import { Inbox, Archive, ArchiveRestore, CheckCheck, ChevronLeft, ChevronDown, ChevronRight, Send } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { SupportClient } from "../support/SupportClient"

interface Message {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  archived: boolean
  ticket_id: string | null
  sender_role: "admin" | "user"
  created_at: string
}

interface Ticket {
  id: string
  category: "feedback" | "billing" | "bug"
  subject: string
  body: string
  status: "open" | "closed"
  created_at: string
}

interface Transcript {
  id: string
  title: string | null
}

interface Props {
  initialMessages: Message[]
  initialTickets:  Ticket[]
  transcripts:     Transcript[]
  initialTab:      "inbox" | "support"
}

const CATEGORY_STYLES: Record<string, string> = {
  bug:      "bg-error/10 text-error",
  billing:  "bg-warning/10 text-warning",
  feedback: "bg-success/10 text-success",
}

const CATEGORY_LABELS: Record<string, string> = {
  feedback: "Feedback",
  billing:  "Billing",
  bug:      "Bug",
}

// "Today" / "Yesterday" / "Jul 1" / "Jul 1, 2025"
function formatDate(iso: string): string {
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

export function MessagesClient({ initialMessages, initialTickets, transcripts, initialTab }: Props) {
  const [messages, setMessages]         = useState<Message[]>(initialMessages)
  const [activeTab, setActiveTab]       = useState<"inbox" | "support">(initialTab)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  // User-reply state (per ticket)
  const [replyingTo, setReplyingTo]   = useState<string | null>(null)
  const [replyBody, setReplyBody]     = useState("")
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError]   = useState<string | null>(null)

  // Inbox: only messages without a ticket_id
  const inboxMessages = messages.filter((m) => m.ticket_id === null)
  const inbox    = inboxMessages.filter((m) => !m.archived)
  const archived = inboxMessages.filter((m) => m.archived)
  const visible  = showArchived ? archived : inbox
  const unreadCount = inbox.filter((m) => !m.read).length
  const selected = messages.find((m) => m.id === selectedId)

  // Ticket replies keyed by ticket_id
  const repliesByTicket = messages.reduce<Record<string, Message[]>>((acc, m) => {
    if (m.ticket_id) {
      acc[m.ticket_id] = [...(acc[m.ticket_id] ?? []), m]
    }
    return acc
  }, {})

  const ticketHasUnreadReply = (ticketId: string) =>
    (repliesByTicket[ticketId] ?? []).some((m) => m.sender_role === "admin" && !m.read)

  const markRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m))
    const supabase = createClient()
    await supabase.from("messages").update({ read: true }).eq("id", id)
    window.dispatchEvent(new CustomEvent("indxr-messages-read"))
  }

  const markTicketRepliesRead = async (ticketId: string) => {
    const unread = (repliesByTicket[ticketId] ?? []).filter((m) => m.sender_role === "admin" && !m.read)
    if (unread.length === 0) return
    setMessages((prev) => prev.map((m) =>
      m.ticket_id === ticketId && m.sender_role === "admin" ? { ...m, read: true } : m
    ))
    const supabase = createClient()
    await supabase.from("messages").update({ read: true }).in("id", unread.map((m) => m.id))
    window.dispatchEvent(new CustomEvent("indxr-messages-read"))
  }

  const setArchived = async (id: string, value: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, archived: value } : m))
    if (value && selectedId === id) { setSelectedId(null); setMobileDetail(false) }
    const supabase = createClient()
    await supabase.from("messages").update({ archived: value }).eq("id", id)
  }

  const markAllRead = async () => {
    const unreadIds = inbox.filter((m) => !m.read).map((m) => m.id)
    setMessages((prev) => prev.map((m) => m.ticket_id === null ? { ...m, read: true } : m))
    if (unreadIds.length > 0) {
      const supabase = createClient()
      await supabase.from("messages").update({ read: true }).in("id", unreadIds)
      window.dispatchEvent(new CustomEvent("indxr-messages-read"))
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    const msg = messages.find((m) => m.id === id)
    if (msg && !msg.read) markRead(id)
    setMobileDetail(true)
  }

  const switchTopTab = (tab: "inbox" | "support") => {
    setActiveTab(tab)
    setSelectedId(null)
    setMobileDetail(false)
  }

  const handleExpandTicket = (ticketId: string) => {
    const isOpen = expandedTicket === ticketId
    setExpandedTicket(isOpen ? null : ticketId)
    if (!isOpen) markTicketRepliesRead(ticketId)
    if (replyingTo && replyingTo !== ticketId) { setReplyingTo(null); setReplyBody(""); setReplyError(null) }
  }

  const handleSendReply = async (ticketId: string) => {
    if (!replyBody.trim() || replySending) return
    setReplySending(true)
    setReplyError(null)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      })
      if (res.ok) {
        // Optimistically add reply to thread
        const newMsg: Message = {
          id:          crypto.randomUUID(),
          title:       "",
          body:        replyBody.trim(),
          type:        "support",
          read:        true,
          archived:    false,
          ticket_id:   ticketId,
          sender_role: "user",
          created_at:  new Date().toISOString(),
        }
        setMessages((prev) => [...prev, newMsg])
        setReplyBody("")
        setReplyingTo(null)
      } else if (res.status === 409) {
        setReplyError("This ticket is closed — open a new ticket to continue.")
      } else {
        setReplyError("Failed to send reply. Please try again.")
      }
    } catch {
      setReplyError("No connection. Check your internet and try again.")
    } finally {
      setReplySending(false)
    }
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-fg">Messages</h1>
          {unreadCount > 0 && activeTab === "inbox" && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-fg-on-accent text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {activeTab === "inbox" && !showArchived && unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-fg-muted hover:text-fg">
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Top-level tabs: Inbox / Support */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => switchTopTab("inbox")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "inbox" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          Inbox
          {unreadCount > 0 && <span className="ml-1.5 text-xs text-accent">({unreadCount})</span>}
        </button>
        <button
          onClick={() => switchTopTab("support")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "support" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          Support
        </button>
      </div>

      {/* ── Inbox tab ── */}
      {activeTab === "inbox" && (
        <>
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => { setShowArchived(false); setSelectedId(null); setMobileDetail(false) }}
              className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors",
                !showArchived ? "border-accent bg-accent-subtle text-accent" : "border-border text-fg-muted hover:text-fg"
              )}
            >
              Active
            </button>
            <button
              onClick={() => { setShowArchived(true); setSelectedId(null); setMobileDetail(false) }}
              className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors",
                showArchived ? "border-accent bg-accent-subtle text-accent" : "border-border text-fg-muted hover:text-fg"
              )}
            >
              Archived
              {archived.length > 0 && <span className="ml-1 opacity-60">({archived.length})</span>}
            </button>
          </div>

          <div className="flex gap-4 lg:gap-6">
            {/* Message list */}
            <div className={cn("flex flex-col gap-1 w-full lg:w-80 shrink-0", mobileDetail && "hidden md:flex")}>
              {visible.length === 0 ? (
                <div className="relative overflow-hidden rounded-lg text-center py-12 text-fg-muted">
                  {/* Empty states keep the honeycomb (system.md §5), even though the working
                      Messages page no longer carries the blanket wash (ADR-079). */}
                  <HexagonPattern className="opacity-[0.04] dark:opacity-[0.06]" />
                  <div className="relative">
                    <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{showArchived ? "No archived messages." : "No messages — we'll write when something matters."}</p>
                  </div>
                </div>
              ) : (
                visible.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded border transition-colors cursor-pointer",
                      selectedId === msg.id
                        ? "bg-accent-subtle border-accent"
                        : "bg-surface border-border hover:bg-surface-elevated",
                      !msg.read && selectedId !== msg.id && "border-l-2 border-l-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        selectedId === msg.id ? "text-accent" : "text-fg"
                      )}>
                        {msg.title}
                      </span>
                      <span className="text-xs text-fg-muted shrink-0">{formatDate(msg.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-fg-muted truncate">INDXR</span>
                      {!msg.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Message detail */}
            <div className={cn("flex-1 min-w-0", !mobileDetail && "hidden md:block")}>
              {!selected ? (
                <div className="hidden md:flex h-64 items-center justify-center text-fg-muted rounded-lg border border-border bg-surface">
                  <div className="text-center">
                    <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Select a message to read it.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
                    <div>
                      <button
                        onClick={() => setMobileDetail(false)}
                        className="md:hidden flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-2 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                      <h2 className="text-base font-semibold text-fg">{selected.title}</h2>
                      <p className="text-xs text-fg-muted mt-0.5">INDXR · {formatDate(selected.created_at)}</p>
                    </div>
                    {selected.archived ? (
                      <Button variant="ghost" size="sm" onClick={() => setArchived(selected.id, false)} className="shrink-0 text-fg-muted hover:text-fg">
                        <ArchiveRestore className="h-4 w-4 mr-1.5" />Unarchive
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setArchived(selected.id, true)} className="shrink-0 text-fg-muted hover:text-fg">
                        <Archive className="h-4 w-4 mr-1.5" />Archive
                      </Button>
                    )}
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-fg leading-relaxed whitespace-pre-line break-words">{selected.body}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Support tab ── */}
      {activeTab === "support" && (
        <div className="space-y-8">
          <SupportClient transcripts={transcripts} />

          {initialTickets.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-fg mb-3">Your tickets</h2>
              <div className="space-y-3">
                {initialTickets.map((ticket) => {
                  const replies = [...(repliesByTicket[ticket.id] ?? [])].sort(
                    (a, b) => a.created_at.localeCompare(b.created_at)
                  )
                  const isExpanded = expandedTicket === ticket.id
                  const hasUnread = ticketHasUnreadReply(ticket.id)

                  return (
                    <div key={ticket.id} className="rounded-lg border border-border bg-surface overflow-hidden">
                      {/* Ticket header row */}
                      <button
                        onClick={() => handleExpandTicket(ticket.id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors cursor-pointer"
                      >
                        <span className={cn("shrink-0 text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_STYLES[ticket.category])}>
                          {CATEGORY_LABELS[ticket.category]}
                        </span>
                        {hasUnread && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                        <span className="flex-1 text-sm font-medium text-fg truncate">
                          {ticket.subject}
                        </span>
                        <span className={cn(
                          "shrink-0 text-xs px-2 py-0.5 rounded-full",
                          ticket.status === "open" ? "bg-accent-subtle text-accent" : "bg-surface-elevated text-fg-muted"
                        )}>
                          {ticket.status === "open" ? "Open" : "Closed"}
                        </span>
                        {replies.length > 0 && (
                          <span className="shrink-0 text-xs text-fg-muted">
                            {replies.length} {replies.length !== 1 ? "replies" : "reply"}
                          </span>
                        )}
                        <span className="text-xs text-fg-muted shrink-0">{formatDate(ticket.created_at)}</span>
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-fg-muted shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-fg-muted shrink-0" />
                        }
                      </button>

                      {/* Expanded: ticket body + thread + reply form */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {/* Original message (user) */}
                          <div className="px-4 py-3 bg-bg">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-medium text-fg">You</span>
                              <span className="text-xs text-fg-muted">{formatDate(ticket.created_at)}</span>
                            </div>
                            <p className="text-sm text-fg whitespace-pre-line break-words">{ticket.body}</p>
                          </div>

                          {/* Thread messages */}
                          {replies.map((reply) => {
                            const isUserReply = reply.sender_role === "user"
                            return (
                              <div
                                key={reply.id}
                                className={cn(
                                  "px-4 py-3 border-t border-border/50",
                                  isUserReply ? "bg-bg" : "bg-surface"
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isUserReply ? "text-fg" : "text-accent"
                                  )}>
                                    {isUserReply ? "You" : "INDXR Support"}
                                  </span>
                                  <span className="text-xs text-fg-muted">{formatDate(reply.created_at)}</span>
                                </div>
                                <p className="text-sm text-fg whitespace-pre-line break-words">{reply.body}</p>
                              </div>
                            )
                          })}

                          {/* Reply form (open tickets) or closed notice */}
                          {ticket.status === "open" ? (
                            <div className="px-4 py-3 border-t border-border/50 bg-bg">
                              {replyingTo === ticket.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    autoFocus
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value.slice(0, 5000))}
                                    placeholder="Write your reply…"
                                    rows={3}
                                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                                  />
                                  {replyError && <p className="text-xs text-error">{replyError}</p>}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={replySending || !replyBody.trim()}
                                      onClick={() => handleSendReply(ticket.id)}
                                    >
                                      <Send className="h-3.5 w-3.5 mr-1.5" />
                                      {replySending ? "Sending…" : "Send reply"}
                                    </Button>
                                    <Button
                                      size="sm" variant="ghost"
                                      onClick={() => { setReplyingTo(null); setReplyBody(""); setReplyError(null) }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReplyingTo(ticket.id)}
                                  className="text-xs text-fg-muted hover:text-fg transition-colors cursor-pointer"
                                >
                                  + Reply to this ticket
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="px-4 py-2.5 border-t border-border/50 bg-surface-elevated">
                              <p className="text-xs text-fg-muted">
                                This ticket is closed.{" "}
                                <button
                                  onClick={() => switchTopTab("support")}
                                  className="underline hover:text-fg transition-colors cursor-pointer"
                                >
                                  Open a new ticket
                                </button>{" "}
                                if you need more help.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
