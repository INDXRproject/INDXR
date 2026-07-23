import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, AudioLines } from "lucide-react"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
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
    <Link href={href} className="text-xs font-medium text-fg-muted hover:text-fg flex items-center gap-1 transition-colors">
      {label} <ChevronRight className="h-3 w-3" />
    </Link>
  )

  return (
    <div className="relative min-h-full">
      {/* Same very-light honeycomb texture as /dashboard/billing. */}
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />

      <div className="relative max-w-4xl mx-auto w-full flex flex-col">
        <PageHeader
          compact
          eyebrow="Dashboard"
          title="Home"
          lead="Your credits, storage, messages, and recent transcripts at a glance."
        />

        {/* ── Credits ── */}
        <section className="mb-12">
          <SectionLabel label="Credits" />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-6 py-5">
            <div className="flex items-center gap-3">
              <HexagonCreditIcon className="size-9 shrink-0" />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <HomeCreditsBalance />
                  <span className="text-sm text-fg-muted">credits</span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">1 credit = 1 minute of AI transcription</p>
              </div>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm">Buy more</Button>
            </Link>
          </div>
        </section>

        {/* ── Library storage ── shared meter + upgrade action (same as /dashboard/account) ── */}
        <section className="mb-12">
          <SectionLabel label="Library storage" />
          <StorageMeterCard libraryBytes={libraryBytes} capBytes={capBytes} headless />
        </section>

        {/* ── Messages ── compact notification rows ── */}
        <section className="mb-12">
          <SectionLabel label="Messages" action={linkAction("View all", "/dashboard/messages")} />
          {recentMessages.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-6 text-center">
              <p className="text-sm text-fg-muted">No messages yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border-subtle overflow-hidden">
              {recentMessages.map((msg) => (
                <Link
                  key={msg.id}
                  href="/dashboard/messages"
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!msg.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                    <span className={`text-sm truncate ${msg.read ? "text-fg" : "font-semibold text-fg"}`}>{msg.title}</span>
                    <span className="text-xs text-fg-muted truncate hidden sm:inline">{msg.body}</span>
                  </div>
                  <span className="text-xs text-fg-muted shrink-0">{formatDate(msg.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent transcripts ── */}
        <section className="mb-12">
          <SectionLabel label="Recent transcripts" action={linkAction("Library", "/dashboard/library")} />
          {recentTranscripts.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
              <p className="text-sm text-fg-muted mb-4">No transcripts yet — transcribe your first video.</p>
              <Link href="/dashboard/transcribe">
                <Button className="gap-2">
                  <AudioLines className="h-4 w-4" />
                  Transcribe a video
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border-subtle overflow-hidden">
              {recentTranscripts.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/library/${t.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-elevated transition-colors"
                >
                  <span className="text-sm text-fg truncate">{t.title ?? "Untitled transcript"}</span>
                  <span className="text-xs text-fg-muted shrink-0">{formatDate(t.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Statistics ── */}
        <section>
          <SectionLabel label="Statistics" action={linkAction("Library", "/dashboard/library")} />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface px-6 py-5">
              <p className="text-sm font-medium text-fg-muted mb-1">Total transcripts</p>
              <p className="text-3xl font-semibold text-fg tabular-nums">{transcriptCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-6 py-5">
              <p className="text-sm font-medium text-fg-muted mb-1">Collections</p>
              <p className="text-3xl font-semibold text-fg tabular-nums">{collectionsCount}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
