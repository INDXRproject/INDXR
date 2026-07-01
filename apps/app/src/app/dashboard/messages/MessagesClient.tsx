"use client"

import { useState } from "react"
import { Inbox, Archive, ArchiveRestore, CheckCheck, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
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

const CATEGORY_LABELS: Record<string, string> = {
  feedback: "Feedback",
  billing:  "Billing",
  bug:      "Bug",
}

export function MessagesClient({ initialMessages, initialTickets, transcripts, initialTab }: Props) {
  const [messages, setMessages]     = useState<Message[]>(initialMessages)
  const [activeTab, setActiveTab]   = useState<"inbox" | "support">(initialTab)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  // Inbox: only messages without a ticket_id
  const inboxMessages = messages.filter((m) => m.ticket_id === null)
  const inbox   = inboxMessages.filter((m) => !m.archived)
  const archived = inboxMessages.filter((m) => m.archived)
  const visible  = showArchived ? archived : inbox
  const unreadCount = inbox.filter((m) => !m.read).length
  const selected = messages.find((m) => m.id === selectedId)

  // Ticket replies: messages keyed by ticket_id
  const repliesByTicket = messages.reduce<Record<string, Message[]>>((acc, m) => {
    if (m.ticket_id) {
      acc[m.ticket_id] = [...(acc[m.ticket_id] ?? []), m]
    }
    return acc
  }, {})

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString()
  }

  const markRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m))
    const supabase = createClient()
    await supabase.from("messages").update({ read: true }).eq("id", id)
  }

  const setArchived = async (id: string, value: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, archived: value } : m))
    if (value && selectedId === id) {
      setSelectedId(null)
      setMobileDetail(false)
    }
    const supabase = createClient()
    await supabase.from("messages").update({ archived: value }).eq("id", id)
  }

  const markAllRead = async () => {
    const unreadIds = inbox.filter((m) => !m.read).map((m) => m.id)
    setMessages((prev) => prev.map((m) => m.ticket_id === null ? { ...m, read: true } : m))
    if (unreadIds.length > 0) {
      const supabase = createClient()
      await supabase.from("messages").update({ read: true }).in("id", unreadIds)
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
            activeTab === "inbox"
              ? "border-accent text-fg"
              : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1.5 text-xs text-accent">({unreadCount})</span>
          )}
        </button>
        <button
          onClick={() => switchTopTab("support")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "support"
              ? "border-accent text-fg"
              : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          Support
        </button>
      </div>

      {/* ── Inbox tab ── */}
      {activeTab === "inbox" && (
        <>
          {/* Archive sub-filter */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => { setShowArchived(false); setSelectedId(null); setMobileDetail(false) }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full border transition-colors",
                !showArchived
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border text-fg-muted hover:text-fg"
              )}
            >
              Active
            </button>
            <button
              onClick={() => { setShowArchived(true); setSelectedId(null); setMobileDetail(false) }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full border transition-colors",
                showArchived
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border text-fg-muted hover:text-fg"
              )}
            >
              Archived
              {archived.length > 0 && (
                <span className="ml-1 opacity-60">({archived.length})</span>
              )}
            </button>
          </div>

          <div className="flex gap-4 lg:gap-6">
            {/* Message list */}
            <div className={cn("flex flex-col gap-1 w-full lg:w-80 shrink-0", mobileDetail && "hidden md:flex")}>
              {visible.length === 0 ? (
                <div className="text-center py-12 text-fg-muted">
                  <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    {showArchived ? "No archived messages." : "No messages — we'll write when something matters."}
                  </p>
                </div>
              ) : (
                visible.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded border transition-colors cursor-pointer",
                      selectedId === msg.id
                        ? "bg-accent-subtle border-accent text-accent"
                        : "bg-surface border-border hover:bg-surface-elevated",
                      !msg.read && selectedId !== msg.id && "border-l-2 border-l-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={cn("text-sm font-medium truncate", selectedId === msg.id ? "text-accent" : "text-fg")}>
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
                        <ArchiveRestore className="h-4 w-4 mr-1.5" />
                        Unarchive
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setArchived(selected.id, true)} className="shrink-0 text-fg-muted hover:text-fg">
                        <Archive className="h-4 w-4 mr-1.5" />
                        Archive
                      </Button>
                    )}
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{selected.body}</p>
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
          {/* Submit form */}
          <SupportClient transcripts={transcripts} />

          {/* Ticket history */}
          {initialTickets.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-fg mb-3">Your tickets</h2>
              <div className="space-y-3">
                {initialTickets.map((ticket) => {
                  const replies = repliesByTicket[ticket.id] ?? []
                  const isOpen = expandedTicket === ticket.id

                  return (
                    <div key={ticket.id} className="rounded-lg border border-border bg-surface overflow-hidden">
                      {/* Ticket header row */}
                      <button
                        onClick={() => setExpandedTicket(isOpen ? null : ticket.id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors cursor-pointer"
                      >
                        {/* Category badge */}
                        <span className={cn(
                          "shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
                          ticket.category === "bug"      && "bg-error/10 text-error",
                          ticket.category === "billing"  && "bg-warning/10 text-warning",
                          ticket.category === "feedback" && "bg-accent-subtle text-accent",
                        )}>
                          {CATEGORY_LABELS[ticket.category]}
                        </span>
                        <span className="flex-1 text-sm font-medium text-fg truncate">{ticket.subject}</span>
                        <span className={cn(
                          "shrink-0 text-xs px-2 py-0.5 rounded-full",
                          ticket.status === "open"   ? "bg-accent-subtle text-accent" : "bg-surface-elevated text-fg-muted"
                        )}>
                          {ticket.status === "open" ? "Open" : "Closed"}
                        </span>
                        {replies.length > 0 && (
                          <span className="shrink-0 text-xs text-fg-muted">{replies.length} {replies.length !== 1 ? "replies" : "reply"}</span>
                        )}
                        <span className="text-xs text-fg-muted shrink-0">{formatDate(ticket.created_at)}</span>
                        {isOpen
                          ? <ChevronDown className="h-4 w-4 text-fg-muted shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-fg-muted shrink-0" />
                        }
                      </button>

                      {/* Expanded: ticket body + replies */}
                      {isOpen && (
                        <div className="border-t border-border">
                          <div className="px-4 py-3 bg-bg">
                            <p className="text-xs text-fg-muted mb-1">Your message</p>
                            <p className="text-sm text-fg whitespace-pre-line">{ticket.body}</p>
                          </div>
                          {replies.map((reply) => (
                            <div key={reply.id} className="px-4 py-3 border-t border-border/50 bg-surface">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-fg">INDXR Support</p>
                                <p className="text-xs text-fg-muted">{formatDate(reply.created_at)}</p>
                              </div>
                              <p className="text-sm text-fg whitespace-pre-line">{reply.body}</p>
                            </div>
                          ))}
                          {replies.length === 0 && (
                            <div className="px-4 py-3 border-t border-border/50">
                              <p className="text-xs text-fg-muted">No replies yet — we'll get back to you as soon as possible.</p>
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
