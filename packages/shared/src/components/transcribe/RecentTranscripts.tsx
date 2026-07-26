"use client"

import { useEffect, useState } from "react"

import { createClient } from "../../utils/supabase/client"
import { appHref } from "../../lib/cross-host-links"

/**
 * Idle-state "Recent" row under the workbench for logged-in users (ADR-079): the last
 * three transcripts, using the same transcripts query the library already runs — no new
 * data source. Renders nothing when there are none (or no session), so it never leaves an
 * empty shell. Follows the library row language: title-driven rows, hairline dividers,
 * right-aligned muted metadata (LESSONS 2026-07-03).
 */
type RecentRow = { id: string; title: string | null; duration: number | null; created_at: string }

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function durationLabel(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.round(seconds / 60)
  return `${Math.max(1, m)} min`
}

export function RecentTranscripts({ className }: { className?: string }) {
  const [rows, setRows] = useState<RecentRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setRows([]); return }
      const { data } = await supabase
        .from("transcripts")
        .select("id, title, duration, created_at")
        .order("created_at", { ascending: false })
        .limit(3)
      if (!cancelled) setRows((data ?? []) as RecentRow[])
    })()
    return () => { cancelled = true }
  }, [])

  if (!rows || rows.length === 0) return null

  return (
    <div className={`mx-auto w-full max-w-[640px] ${className ?? ""}`}>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-[var(--fg-muted)]">Recent</p>
      <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        {rows.map((r) => {
          const dur = durationLabel(r.duration)
          return (
            <li key={r.id}>
              <a
                href={appHref(`/dashboard/library/${r.id}`)}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--fg)]">
                  {r.title?.trim() || "Untitled transcript"}
                </span>
                <span className="shrink-0 text-xs text-[var(--fg-muted)] tabular-nums">
                  {dur ? `${dur} · ` : ""}{relativeDate(r.created_at)}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
