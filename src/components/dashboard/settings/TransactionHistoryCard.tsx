"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { Button } from "@/components/ui/button"

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

interface Transaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  reason: string
  created_at: string
}

export function TransactionHistoryCard({ transactions, credits = 0 }: { transactions: Transaction[], credits?: number }) {
  const [showAll, setShowAll] = useState(false)
  
  const displayedTransactions = showAll ? transactions : transactions.slice(0, 10)

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Billing & Credits</CardTitle>
        <CardDescription className="text-muted-foreground">Your current balance and transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Credits Display */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="text-2xl font-semibold text-foreground">{credits} credits</span>
        </div>

        {/* Responsive Table Container */}
        <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-muted/50 bg-muted/30">
                <TableHead className="text-muted-foreground w-[120px]">Date</TableHead>
                <TableHead className="text-muted-foreground">Activity</TableHead>
                <TableHead className="text-muted-foreground text-right w-[100px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                      {timeAgo(tx.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground min-w-[150px]">{tx.reason}</TableCell>
                    <TableCell className="text-right">
                      <span className={`flex items-center justify-end gap-1 font-mono ${
                        tx.type === 'credit' ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}
                        {tx.amount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {transactions.length > 10 && (
            <div className="p-4 border-t border-border bg-muted/10 flex justify-center">
              <Button 
                variant="ghost" 
                onClick={() => setShowAll(!showAll)}
                className="text-muted-foreground hover:text-foreground w-full"
              >
                {showAll ? "Show less" : `View all transactions (${transactions.length})`}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
