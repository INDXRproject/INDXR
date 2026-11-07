import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, AudioLines, Upload, Youtube, ListVideo } from "lucide-react"
import { HexagonCreditIcon } from "@indxr/shared/components/icons/HexagonCreditIcon"
import { PageHeader } from "@indxr/shared/components/PageHeader"
import { SectionLabel } from "@indxr/shared/components/SectionLabel"
import { Button } from "@indxr/shared/components/ui/button"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { HomeCreditsBalance } from "@/components/dashboard/HomeCreditsBalance"
import { StorageMeterCard } from "@/components/dashboard/StorageMeterCard"

export const metadata: Metadata = {
  title: "Home — INDXR.AI",
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Library storage: real footprint + effective per-user cap (base + purchased bonus).
  let libraryBytes = 0
  let capBytes = 104857600 // 100 MiB base
  if (user) {
    const { data: uc } = await supabase
      .from("user_credits")
      .select("library_bytes, library_bytes_cap, library_bytes_bonus")
      .eq("user_id", user.id)
      .single()
    const u = uc as { library_bytes?: number; library_bytes_cap?: number; library_bytes_bonus?: number } | null
    libraryBytes = u?.library_bytes ?? 0
    capBytes = (u?.library_bytes_cap ?? 104857600) + (u?.library_bytes_bonus ?? 0)
  }

  // Recent inbox messages (ticket_id IS NULL = inbox only)
  let recentMessages: Array<{ id: string; title: string; body: string; read: boolean; created_at: string }> = []
  if (user) {
    const { data } = await supabase
      .from("messages")
      .select("id, title, body, read, created_at")
      .eq("user_id", user.id)
      .is("ticket_id", null)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(3)
    if (data) recentMessages = data as typeof recentMessages
  }

  // Recent transcripts — the 5 most recent (column is `title`, not `video_title`).
  let recentTranscripts: Array<{ id: string; title: string | null; created_at: string }> = []
  if (user) {
    const { data } = await supabase
      .from("transcripts")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    if (data) recentTranscripts = data as typeof recentTranscripts
  }

  // Library statistics
  let transcriptCount = 0
  let collectionsCount = 0
  if (user) {
    const [txRes, colRes] = await Promise.all([
      supabase.from("transcripts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("collections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ])
    transcriptCount = txRes.count ?? 0
    collectionsCount = colRes.count ?? 0
  }

  const formatDate = (iso: string) => {
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

  const linkAction = (label: string, href: string) => (
    <Link href={href} className="font-mono text-xs uppercase tracking-[0.06em] text-fg hover:text-fg-strong hover:underline underline-offset-4 flex items-center gap-1">
      {label} <ChevronRight className="h-3 w-3" />
    </Link>
  )

  // Start a transcript — the three sources, each deep-linking the workbench tab (?mode=, ADR-079).
  const starts = [
    { mode: "audio", label: "Upload a file", sub: "Audio or video", Icon: Upload },
    { mode: "video", label: "YouTube link", sub: "Captions free", Icon: Youtube },
    { mode: "playlist", label: "Playlist", sub: "A whole course", Icon: ListVideo },
  ] as const

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col">
        <PageHeader compact eyebrow="Dashboard" title="Home" />

        {/* ── Desk: start something (left) + balance (right) ── */}
        <section className="mb-12 grid border-2 border-border-strong lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="border-b-2 border-border-strong p-6 lg:border-b-0 lg:border-r-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-fg-strong">New transcript</p>
            <div className="mt-4 grid border-2 border-border-strong sm:grid-cols-3">
              {starts.map(({ mode, label, sub, Icon }, i) => (
                <Link
                  key={mode}
                  href={mode === "audio" ? "/dashboard/transcribe" : `/dashboard/transcribe?mode=${mode}`}
                  className={`group flex items-center gap-3 p-4 transition-colors hover:bg-accent sm:flex-col sm:items-start ${i < starts.length - 1 ? "border-b-2 border-border-strong sm:border-b-0 sm:border-r-2" : ""}`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-fg-strong" />
                  <span>
                    <span className="block font-bold text-fg-strong">{label}</span>
                    <span className="block text-xs text-fg-subtle group-hover:text-fg-on-accent">{sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 bg-fg-strong p-6 text-bg">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em]">Balance</p>
            <div className="flex items-end gap-3">
              <HexagonCreditIcon className="size-10 shrink-0" />
              <HomeCreditsBalance className="text-6xl font-bold leading-none tracking-[-0.04em] tabular-nums" />
              <span className="pb-1 font-mono text-sm opacity-80">credits</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm opacity-80">1 credit = 1 minute of AI transcription. Never expires.</p>
              <Link
                href="/dashboard/credits"
                className="inline-flex h-10 items-center border-2 border-bg bg-accent px-4 text-sm font-bold text-fg-on-accent hover:bg-accent-hover"
              >
                Buy credits
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ── Recent transcripts ── */}
          <section>
            <SectionLabel label="Recent transcripts" action={linkAction("Library", "/dashboard/library")} />
            {recentTranscripts.length === 0 ? (
              <div className="border-2 border-border-strong px-4 py-8 text-center">
                <p className="text-sm text-fg-muted mb-4">No transcripts yet. Start with a file or a YouTube link above.</p>
                <Link href="/dashboard/transcribe">
                  <Button className="gap-2">
                    <AudioLines className="h-4 w-4" />
                    Transcribe a video
                  </Button>
                </Link>
              </div>
            ) : (
              <ol className="border-t-2 border-border-strong">
                {recentTranscripts.map((t) => (
                  <li key={t.id} className="border-b border-border">
                    <Link
                      href={`/dashboard/library/${t.id}`}
                      className="flex items-baseline justify-between gap-4 py-3 hover:bg-bg-subtle transition-colors"
                    >
                      <span className="truncate font-medium text-fg-strong" dir="auto">{t.title ?? "Untitled transcript"}</span>
                      <span className="shrink-0 font-mono text-xs text-fg-muted">{formatDate(t.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── Library: counts + storage ── */}
          <section>
            <SectionLabel label="Library" />
            <div className="mb-6 grid grid-cols-2 border-2 border-border-strong">
              <div className="border-r-2 border-border-strong p-4">
                <p className="text-4xl font-bold tracking-[-0.03em] text-fg-strong tabular-nums">{transcriptCount}</p>
                <p className="mt-1 font-mono text-xs uppercase text-fg">Transcripts</p>
              </div>
              <div className="p-4">
                <p className="text-4xl font-bold tracking-[-0.03em] text-fg-strong tabular-nums">{collectionsCount}</p>
                <p className="mt-1 font-mono text-xs uppercase text-fg">Collections</p>
              </div>
            </div>
            {/* shared meter + upgrade action (same as /dashboard/account) */}
            <StorageMeterCard libraryBytes={libraryBytes} capBytes={capBytes} headless />
          </section>
        </div>

        {/* ── Messages ── compact notification rows ── */}
        <section className="mt-12">
          <SectionLabel label="Messages" action={linkAction("View all", "/dashboard/messages")} />
          {recentMessages.length === 0 ? (
            <p className="text-sm text-fg-muted">No messages yet.</p>
          ) : (
            <div className="border-2 border-border-strong divide-y divide-border">
              {recentMessages.map((msg) => (
                <Link
                  key={msg.id}
                  href="/dashboard/messages"
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg-subtle transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {!msg.read && <span className="mt-1.5 h-2 w-2 bg-accent border border-border-strong shrink-0" aria-label="Unread" />}
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${msg.read ? "text-fg" : "font-bold text-fg-strong"}`}>{msg.title}</p>
                      <p className="text-xs text-fg-muted truncate mt-0.5">{msg.body}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-fg-muted shrink-0 mt-0.5">{formatDate(msg.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
  )
}
