import { createAdminClient } from "@/utils/supabase/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CreditsCsvExport } from "./CreditsCsvExport"

const PER_PAGE = 50

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const typeFilter = params.type ?? ""
  const from = params.from ?? ""
  const to = params.to ?? ""

  const admin = createAdminClient()
  const offset = (page - 1) * PER_PAGE

  // Build query
  let query = admin
    .from("credit_transactions")
    .select("id, user_id, amount, type, reason, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1)

  if (typeFilter) query = query.eq("type", typeFilter)
  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to + "T23:59:59")

  const { data: transactions, count } = await query

  // Summary totals (unfiltered)
  const [purchasedRes, consumedRes] = await Promise.all([
    admin.from("credit_transactions").select("amount").eq("type", "credit"),
    admin.from("credit_transactions").select("amount").eq("type", "debit"),
  ])

  const totalPurchased = purchasedRes.data?.reduce((s, r) => s + r.amount, 0) ?? 0
  const totalConsumed = consumedRes.data?.reduce((s, r) => s + r.amount, 0) ?? 0

  // Fetch user emails for displayed rows
  const userIds = [...new Set(transactions?.map((t) => t.user_id) ?? [])]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const totalPages = count ? Math.ceil(count / PER_PAGE) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-muted-foreground text-sm">All credit transactions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Purchased" value={totalPurchased.toLocaleString()} />
        <MetricCard label="Total Consumed" value={totalConsumed.toLocaleString()} />
        <MetricCard label="Net Balance" value={(totalPurchased - totalConsumed).toLocaleString()} />
        <MetricCard label="Transactions" value={(count ?? 0).toLocaleString()} />
      </div>

      <form className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <select
            name="type"
            defaultValue={typeFilter}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">All</option>
            <option value="credit">Credit (purchases)</option>
            <option value="debit">Debit (usage)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm border rounded-md bg-background hover:bg-muted"
        >
          Filter
        </button>
        <a
          href="/admin/credits"
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Reset
        </a>
        <div className="ml-auto">
          <CreditsCsvExport transactions={transactions?.map(t => ({
            ...t,
            email: emailMap[t.user_id] ?? t.user_id,
          })) ?? []} />
        </div>
      </form>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transactions?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
            {transactions?.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">
                  {emailMap[tx.user_id] ?? tx.user_id.slice(0, 8) + "…"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={tx.type === "credit" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-xs font-mono font-semibold ${
                    tx.type === "credit" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {tx.amount}
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">
                  {tx.reason}
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                  {tx.metadata && Object.keys(tx.metadata).length > 0
                    ? JSON.stringify(tx.metadata).slice(0, 60)
                    : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} · {count ?? 0} total
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              href={`/admin/credits?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
              className="px-3 py-1 border rounded hover:bg-muted"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/admin/credits?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
              className="px-3 py-1 border rounded hover:bg-muted"
            >
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
