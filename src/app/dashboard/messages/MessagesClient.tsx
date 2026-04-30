"use client"

// TODO: Backend hookup — replace mock data with fetch from admin messages API
// TODO: Mark-read API — POST /api/messages/[id]/read
// TODO: Archive API — POST /api/messages/[id]/archive

import { useState } from "react"
import { Inbox, Archive, CheckCheck, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  sender: string
  title: string
  body: string
  date: string
  read: boolean
  archived: boolean
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "Khidr @ INDXR",
    title: "Welcome to INDXR",
    body: "Thanks for signing up. Your 25 welcome credits are in your account and ready to use.\n\nTo get started, paste any YouTube URL into the Transcribe page. Caption extraction is always free — AI transcription uses 1 credit per minute.\n\nIf you have any questions, reply here or visit the docs.",
    date: "Today",
    read: false,
    archived: false,
  },
  {
    id: "2",
    sender: "INDXR",
    title: "Export tip: Markdown for Notion",
    body: "Did you know you can export any transcript as Markdown and paste it directly into Notion? Headings, bold text, and timestamps all carry over cleanly.\n\nTry it from the Export menu in any transcript detail view.",
    date: "Yesterday",
    read: false,
    archived: false,
  },
  {
    id: "3",
    sender: "Khidr @ INDXR",
    title: "Credits added to your account",
    body: "We've added 10 bonus credits to your account as a thank-you for your early feedback. They don't expire, so use them whenever you need.\n\nKeep the feedback coming — it genuinely shapes what we build next.",
    date: "2 days ago",
    read: true,
    archived: false,
  },
  {
    id: "4",
    sender: "INDXR",
    title: "New: RAG-optimized JSON export",
    body: "You can now export transcripts as RAG-optimized JSON — pre-chunked into 30-second segments with full metadata (title, channel, timestamps, language).\n\nThis format feeds directly into LangChain, LlamaIndex, and most vector databases without preprocessing.",
    date: "3 days ago",
    read: true,
    archived: false,
  },
  {
    id: "5",
    sender: "Khidr @ INDXR",
    title: "Playlist extraction is live",
    body: "You can now extract transcripts from entire YouTube playlists in one go. Paste a playlist URL in the Transcribe page, select your videos, and INDXR processes them in parallel.\n\nThe first 3 videos are free. After that, 1 credit per video.",
    date: "1 week ago",
    read: true,
    archived: false,
  },
]

export function MessagesClient() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const selected = messages.find((m) => m.id === selectedId)
  const visible = messages.filter((m) => !m.archived)
  const unreadCount = visible.filter((m) => !m.read).length

  const markRead = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m))
  }

  const archive = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, archived: true } : m))
    if (selectedId === id) {
      setSelectedId(null)
      setMobileDetail(false)
    }
  }

  const markAllRead = () => {
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    markRead(id)
    setMobileDetail(true)
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-[var(--fg)]">Messages</h1>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--accent)] text-[var(--fg-on-accent)] text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Two-column layout desktop, single column mobile */}
      <div className="flex gap-4 lg:gap-6">

        {/* Message list */}
        <div className={cn(
          "flex flex-col gap-1 w-full lg:w-80 shrink-0",
          mobileDetail && "hidden md:flex"
        )}>
          {visible.length === 0 ? (
            <div className="text-center py-12 text-[var(--fg-muted)]">
              <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No messages — we'll write when something matters.</p>
            </div>
          ) : (
            visible.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-[var(--radius)] border transition-colors cursor-pointer",
                  selectedId === msg.id
                    ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)]",
                  !msg.read && selectedId !== msg.id && "border-l-2 border-l-[var(--accent)]"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={cn("text-sm font-medium truncate", selectedId === msg.id ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
                    {msg.title}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)] shrink-0">{msg.date}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--fg-muted)] truncate">{msg.sender}</span>
                  {!msg.read && <span className="h-2 w-2 rounded-full bg-[var(--accent)] shrink-0" />}
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
            <div className="hidden md:flex h-64 items-center justify-center text-[var(--fg-muted)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="text-center">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a message to read it.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between gap-4">
                <div>
                  <button
                    onClick={() => setMobileDetail(false)}
                    className="md:hidden flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-2 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <h2 className="text-base font-semibold text-[var(--fg)]">{selected.title}</h2>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">{selected.sender} · {selected.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => archive(selected.id)}
                  className="shrink-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  <Archive className="h-4 w-4 mr-1.5" />
                  Archive
                </Button>
              </div>
              {/* Detail body */}
              <div className="px-6 py-5">
                <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-line">{selected.body}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
