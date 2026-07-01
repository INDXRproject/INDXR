import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import Link from "next/link"
import { AudioLines, Library, Inbox, ChevronRight } from "lucide-react"
import { createClient } from "@indxr/shared/utils/supabase/server"

export const metadata: Metadata = {
  title: "Home — INDXR.AI",
  robots: { index: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Credits balance
  let creditsBalance = 0
  if (user) {
    const { data } = await supabase
      .rpc("get_credit_balance", { p_user_id: user.id })
      .maybeSingle()
    creditsBalance = (data as number | null) ?? 0
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

  // Recent transcripts (3 most recent)
  let recentTranscripts: Array<{ id: string; video_title: string | null; created_at: string }> = []
  if (user) {
    const { data } = await supabase
      .from("transcripts")
      .select("id, video_title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3)
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-fg">Home</h1>

      {/* ── Section 1: Credits balance ── */}
      <Card className="bg-surface border-border">
        <CardContent className="pt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-fg-muted mb-1">Credits remaining</p>
              {/* KHIDR: schrijf final copy voor credit balance card */}
              <p className="text-4xl font-semibold text-fg tabular-nums">{creditsBalance}</p>
              <p className="text-xs text-fg-muted mt-1">1 credit = 1 minute of AI transcription</p>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm">Buy more</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Transcribe CTA ── */}
      <Card className="bg-surface border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-accent-subtle flex items-center justify-center shrink-0">
                <AudioLines className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-fg">Transcribe a video</p>
                <p className="text-sm text-fg-muted">Paste a YouTube URL to extract the transcript</p>
              </div>
            </div>
            <Link href="/dashboard/transcribe" className="shrink-0">
              <Button>Start transcribing</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Last messages preview ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-fg flex items-center gap-2">
            <Inbox className="h-4 w-4 text-fg-muted" />
            Messages
          </h2>
          <Link href="/dashboard/messages" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1 transition-colors">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recentMessages.length === 0 ? (
          <Card className="bg-surface border-border">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-fg-muted">No messages yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentMessages.map((msg) => (
              <Link key={msg.id} href="/dashboard/messages">
                <Card className={`bg-surface border-border hover:bg-surface-elevated transition-colors cursor-pointer${!msg.read ? " border-l-2 border-l-accent" : ""}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${msg.read ? "font-medium text-fg" : "font-semibold text-fg"}`}>{msg.title}</p>
                        <p className="text-xs text-fg-muted truncate mt-0.5">{msg.body}</p>
                      </div>
                      <span className="text-xs text-fg-muted shrink-0 mt-0.5">{formatDate(msg.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: Recent transcripts ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-fg flex items-center gap-2">
            <Library className="h-4 w-4 text-fg-muted" />
            Recent transcripts
          </h2>
          <Link href="/dashboard/library" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1 transition-colors">
            Library <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recentTranscripts.length === 0 ? (
          <Card className="bg-surface border-border">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-fg-muted">No transcripts yet — try transcribing your first video.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentTranscripts.map((t) => (
              <Link key={t.id} href={`/dashboard/library/${t.id}`}>
                <Card className="bg-surface border-border hover:bg-surface-elevated transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                    <p className="text-sm text-fg truncate">{t.video_title ?? "Untitled transcript"}</p>
                    <span className="text-xs text-fg-muted shrink-0">{formatDate(t.created_at)}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 5: Library statistics ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-fg-muted">Total transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-fg tabular-nums">{transcriptCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-fg-muted">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-fg tabular-nums">{collectionsCount}</p>
            <Link href="/dashboard/library" className="text-xs text-fg-muted hover:text-fg mt-1 block transition-colors">
              View library →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
