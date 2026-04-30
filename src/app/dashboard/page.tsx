import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AudioLines, Library, Inbox, ChevronRight } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

export const metadata: Metadata = {
  title: "Home — INDXR.AI",
  robots: { index: false },
}

// TODO: Backend hookup — fetch from Messages API (admin messages table)
const MOCK_MESSAGES = [
  {
    id: "1",
    sender: "Khidr @ INDXR",
    title: "Welcome to INDXR",
    body: "Thanks for signing up. Your 25 welcome credits are ready to use — try transcribing your first video.",
    date: "Today",
    read: false,
  },
  {
    id: "2",
    sender: "INDXR",
    title: "How to export to Notion",
    body: "Did you know you can copy your transcript as Markdown and paste it directly into Notion?",
    date: "Yesterday",
    read: true,
  },
]

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
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-[var(--fg)]">Home</h1>

      {/* ── Section 1: Credits balance ── */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="pt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--fg-muted)] mb-1">Credits remaining</p>
              {/* KHIDR: schrijf final copy voor credit balance card */}
              <p className="text-4xl font-semibold text-[var(--fg)] tabular-nums">{creditsBalance}</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">1 credit = 1 minute of AI transcription</p>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm">Buy more</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Transcribe CTA ── */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
                <AudioLines className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--fg)]">Transcribe a video</p>
                <p className="text-sm text-[var(--fg-muted)]">Paste a YouTube URL to extract the transcript</p>
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
          <h2 className="text-base font-medium text-[var(--fg)] flex items-center gap-2">
            <Inbox className="h-4 w-4 text-[var(--fg-muted)]" />
            Messages
          </h2>
          <Link href="/dashboard/messages" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1 transition-colors">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {MOCK_MESSAGES.slice(0, 2).map((msg) => (
            <Link key={msg.id} href="/dashboard/messages">
              <Card className={`bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer ${!msg.read ? "border-l-2 border-l-[var(--accent)]" : ""}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">{msg.title}</p>
                      <p className="text-xs text-[var(--fg-muted)] truncate mt-0.5">{msg.body}</p>
                    </div>
                    <span className="text-xs text-[var(--fg-muted)] shrink-0 mt-0.5">{msg.date}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 4: Recent transcripts ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-[var(--fg)] flex items-center gap-2">
            <Library className="h-4 w-4 text-[var(--fg-muted)]" />
            Recent transcripts
          </h2>
          <Link href="/dashboard/library" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1 transition-colors">
            Library <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recentTranscripts.length === 0 ? (
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-[var(--fg-muted)]">No transcripts yet — try transcribing your first video.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentTranscripts.map((t) => (
              <Link key={t.id} href={`/dashboard/library/${t.id}`}>
                <Card className="bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                    <p className="text-sm text-[var(--fg)] truncate">{t.video_title ?? "Untitled transcript"}</p>
                    <span className="text-xs text-[var(--fg-muted)] shrink-0">{formatDate(t.created_at)}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 5: Library statistics ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--fg-muted)]">Total transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[var(--fg)] tabular-nums">{transcriptCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--fg-muted)]">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[var(--fg)] tabular-nums">{collectionsCount}</p>
            <Link href="/dashboard/library" className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] mt-1 block transition-colors">
              View library →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
