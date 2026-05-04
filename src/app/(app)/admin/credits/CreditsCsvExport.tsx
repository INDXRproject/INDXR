"use client"

import { Button } from "@/components/ui/button"

interface Row {
  id: string
  email: string
  type: string
  amount: number
  reason: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export function CreditsCsvExport({ transactions }: { transactions: Row[] }) {
  function download() {
    const header = "ID,Email,Type,Amount,Reason,Metadata,Date"
    const rows = transactions.map((t) =>
      [
        t.id,
        `"${t.email}"`,
        t.type,
        t.amount,
        `"${t.reason.replace(/"/g, '""')}"`,
        `"${t.metadata ? JSON.stringify(t.metadata).replace(/"/g, '""') : ""}"`,
        new Date(t.created_at).toISOString(),
      ].join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `credit-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={download}>
      Export CSV
    </Button>
  )
}
