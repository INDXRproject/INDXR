"use client"

import { useState } from "react"
import { Inbox, Archive, ArchiveRestore, CheckCheck, ChevronLeft } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { createClient } from "@indxr/shared/utils/supabase/client"

interface Message {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  archived: boolean
  created_at: string
}

interface Props {
  initialMessages: Message[]
}

export function MessagesClient({ initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)

  const inbox = messages.filter((m) => !m.archived)
  const archived = messages.filter((m) => m.archived)
  const visible = showArchived ? archived : inbox
  const unreadCount = inbox.filter((m) => !m.read).length
  const selected = messages.find((m) => m.id === selectedId)

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
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
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

  const switchTab = (toArchived: boolean) => {
    setShowArchived(toArchived)
    setSelectedId(null)
    setMobileDetail(false)
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-fg">Messages</h1>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-fg-on-accent text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {!showArchived && unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-fg-muted hover:text-fg">
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Inbox / Archived tab strip */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => switchTab(false)}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            !showArchived
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
          onClick={() => switchTab(true)}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            showArchived
              ? "border-accent text-fg"
              : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          Archived
          {archived.length > 0 && (
            <span className="ml-1.5 text-xs text-fg-muted">({archived.length})</span>
          )}
        </button>
      </div>

      {/* Two-column layout desktop, single column mobile */}
      <div className="flex gap-4 lg:gap-6">

        {/* Message list */}
        <div className={cn(
          "flex flex-col gap-1 w-full lg:w-80 shrink-0",
          mobileDetail && "hidden md:flex"
        )}>
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
        <div className={cn(
          "flex-1 min-w-0",
          !mobileDetail && "hidden md:block"
        )}>
          {!selected ? (
            <div className="hidden md:flex h-64 items-center justify-center text-fg-muted rounded-lg border border-border bg-surface">
              <div className="text-center">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a message to read it.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {/* Detail header */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchived(selected.id, false)}
                    className="shrink-0 text-fg-muted hover:text-fg"
                  >
                    <ArchiveRestore className="h-4 w-4 mr-1.5" />
                    Unarchive
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchived(selected.id, true)}
                    className="shrink-0 text-fg-muted hover:text-fg"
                  >
                    <Archive className="h-4 w-4 mr-1.5" />
                    Archive
                  </Button>
                )}
              </div>
              {/* Detail body */}
              <div className="px-6 py-5">
                <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{selected.body}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
