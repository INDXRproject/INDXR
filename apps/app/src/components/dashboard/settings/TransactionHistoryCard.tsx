"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
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
import { HexagonCreditIcon } from "@indxr/shared/components/icons/HexagonCreditIcon"
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
// netted one. `credits` is the authoritative balance (user_credits.credits via get_user_credits).
export function TransactionHistoryCard({ transactions, credits = 0 }: { transactions: RawCreditTx[]; credits?: number }) {
  const [showAll, setShowAll] = useState(false)

  const activity = buildCreditActivity(transactions)
  const displayed = showAll ? activity : activity.slice(0, 10)

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-lg text-fg">Credit activity</CardTitle>
        <CardDescription className="text-fg-muted">Your balance and history — purchases, usage and refunds</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Credits Display */}
        <div className="mb-6 p-4 bg-surface-elevated/50 rounded-lg border border-border flex items-center justify-between">
            <span className="text-sm text-fg-muted">Current Balance</span>
            <span className="flex items-center gap-2 text-2xl font-semibold text-fg">
              <HexagonCreditIcon className="size-6" />
              {credits} credits
            </span>
        </div>

        {/* Responsive Table Container */}
        <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-surface-elevated/50 bg-surface-elevated/30">
                <TableHead className="text-fg-muted w-[120px]">Date</TableHead>
                <TableHead className="text-fg-muted">Activity</TableHead>
                <TableHead className="text-fg-muted text-right w-[100px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-fg-muted">
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
                          <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-[11px] font-medium text-warning">
                            Pending
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`flex items-center justify-end gap-1 font-mono ${
                          row.pending
                            ? "text-warning"
                            : row.direction === "in"
                              ? "text-success"
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
      </CardContent>
    </Card>
  )
}
