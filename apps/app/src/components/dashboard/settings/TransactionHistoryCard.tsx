"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@indxr/shared/components/ui/table"
import { useState } from "react"
import { Button } from "@indxr/shared/components/ui/button"
import { buildCreditActivity, type RawCreditTx } from "@indxr/shared/lib/creditHistory"

function timeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " years ago"
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " months ago"
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " days ago"
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " hours ago"
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " minutes ago"
    return "Just now"
}

// Renders the user-facing "Credit activity" list. The raw append-only ledger is collapsed to one net
// line per operation by buildCreditActivity (shared, read-only) — see that module for the why. The
// admin panel keeps the full, ungrouped rows via /api/admin/user-detail; this view is deliberately the
// netted one. The balance itself is shown by the page (user_credits.credits via get_user_credits).
export function TransactionHistoryCard({ transactions }: { transactions: RawCreditTx[] }) {
  const [showAll, setShowAll] = useState(false)

  const activity = buildCreditActivity(transactions)
  const displayed = showAll ? activity : activity.slice(0, 10)

  return (
    // Stijl B (2026-11-07): no card or second title — the page's SectionLabel heads this, and the
    // balance is already the first thing on the page, so the duplicate "Current Balance" row is gone.
    <div>
        {/* Responsive Table Container */}
        <div className="border-2 border-border-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-border-strong bg-fg-strong hover:bg-fg-strong">
                <TableHead className="font-mono text-xs uppercase text-bg w-[120px]">Date</TableHead>
                <TableHead className="font-mono text-xs uppercase text-bg">Activity</TableHead>
                <TableHead className="font-mono text-xs uppercase text-bg text-right w-[100px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center font-bold text-fg-strong">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((row) => (
                  <TableRow key={row.id} className="border-border hover:bg-surface-elevated/50 transition-colors">
                    <TableCell className="font-medium text-fg whitespace-nowrap">
                      {timeAgo(row.created_at)}
                    </TableCell>
                    <TableCell className="text-fg-muted min-w-[150px]">
                      <span className="inline-flex items-center gap-2">
                        {row.label}
                        {row.pending && (
                          <span className="border-2 border-border-strong bg-accent px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.04em] text-fg-on-accent">
                            Pending
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`flex items-center justify-end gap-1 font-mono ${
                          row.pending
                            ? "text-warning-fg"
                            : row.direction === "in"
                              ? "text-success-fg"
                              : "text-fg-muted"
                        }`}
                      >
                        {row.direction === "none"
                          ? "0"
                          : `${row.amount > 0 ? "+" : "-"}${Math.abs(row.amount)}`}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {activity.length > 10 && (
            <div className="p-4 border-t border-border bg-surface-elevated/10 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowAll(!showAll)}
                className="text-fg-muted hover:text-fg w-full"
              >
                {showAll ? "Show less" : `View all activity (${activity.length})`}
              </Button>
            </div>
          )}
        </div>
    </div>
  )
}
