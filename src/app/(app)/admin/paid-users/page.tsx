import { createAdminClient } from "@/utils/supabase/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

const PER_PAGE = 50

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-surface p-4 space-y-1">
      <p className="text-xs text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

export default async function AdminPaidUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))

  const admin = createAdminClient()

  // Fetch all Stripe purchases (credit type + has stripe_session_id in metadata)
  const { data: allPurchases } = await admin
    .from("credit_transactions")
    .select("user_id, amount, metadata, created_at")
    .eq("type", "credit")
    .not("metadata->>stripe_session_id", "is", null)
    .order("created_at", { ascending: true })

  if (!allPurchases) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Paid Users</h1>
        <p className="text-fg-muted">No purchase data found.</p>
      </div>
    )
  }

  // Group by user_id
  const userMap: Record<
    string,
    {
      totalPaid: number
      creditsPurchased: number
      purchases: number
      firstPurchase: string
      lastPurchase: string
    }
  > = {}

  for (const tx of allPurchases) {
    const uid = tx.user_id
    const amountPaid = parseFloat(tx.metadata?.amount_paid ?? "0") || 0
    if (!userMap[uid]) {
      userMap[uid] = {
        totalPaid: 0,
        creditsPurchased: 0,
        purchases: 0,
        firstPurchase: tx.created_at,
        lastPurchase: tx.created_at,
      }
    }
    userMap[uid].totalPaid += amountPaid
    userMap[uid].creditsPurchased += tx.amount ?? 0
    userMap[uid].purchases++
    if (tx.created_at < userMap[uid].firstPurchase) userMap[uid].firstPurchase = tx.created_at
    if (tx.created_at > userMap[uid].lastPurchase) userMap[uid].lastPurchase = tx.created_at
  }

  const allPayingUserIds = Object.keys(userMap)
  const totalPayingUsers = allPayingUserIds.length
  const totalRevenue = Object.values(userMap).reduce((s, u) => s + u.totalPaid, 0)
  const arpu = totalPayingUsers > 0 ? totalRevenue / totalPayingUsers : 0
  const totalPurchaseTxs = allPurchases.length
  const avgCreditsPerPurchase =
    totalPurchaseTxs > 0
      ? Object.values(userMap).reduce((s, u) => s + u.creditsPurchased, 0) / totalPurchaseTxs
      : 0

  // Paginate user IDs (sorted by total paid desc)
  const sortedUserIds = allPayingUserIds.sort(
    (a, b) => userMap[b].totalPaid - userMap[a].totalPaid
  )
  const offset = (page - 1) * PER_PAGE
  const pageUserIds = sortedUserIds.slice(offset, offset + PER_PAGE)
  const totalPages = Math.ceil(totalPayingUsers / PER_PAGE)

  // Fetch current credit balances
  const { data: creditsData } = await admin
    .from("user_credits")
    .select("user_id, credits")
    .in("user_id", pageUserIds)

  const balanceMap = Object.fromEntries(
    (creditsData ?? []).map((c) => [c.user_id, c.credits])
  )

  // Fetch emails for this page
  const emailMap: Record<string, string> = {}
  await Promise.all(
    pageUserIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const posthogProjectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID ?? ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paid Users</h1>
        <p className="text-fg-muted text-sm">
          Users who have made at least one Stripe purchase
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={`€${totalRevenue.toFixed(2)}`} />
        <MetricCard label="Paying Users" value={totalPayingUsers} />
        <MetricCard
          label="ARPU"
          value={`€${arpu.toFixed(2)}`}
          sub="avg revenue per user"
        />
        <MetricCard
          label="Avg Credits / Purchase"
          value={Math.round(avgCreditsPerPurchase)}
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total Paid (€)</TableHead>
              <TableHead>Credits Purchased</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Purchases</TableHead>
              <TableHead>First Purchase</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageUserIds.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-fg-muted py-8"
                >
                  No paying users yet
                </TableCell>
              </TableRow>
            )}
            {pageUserIds.map((userId, i) => {
              const stats = userMap[userId]
              const email = emailMap[userId] ?? userId.slice(0, 8) + "…"
              const balance = balanceMap[userId] ?? 0
              const rank = offset + i + 1

              return (
                <TableRow key={userId}>
                  <TableCell className="text-xs text-fg-muted w-8">
                    {rank}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {email}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-semibold text-success-fg">
                    €{stats.totalPaid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {stats.creditsPurchased}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {balance}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {stats.purchases}
                  </TableCell>
                  <TableCell className="text-xs text-fg-muted">
                    {new Date(stats.firstPurchase).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-fg-muted">
                    {new Date(stats.lastPurchase).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users?search=${encodeURIComponent(email)}`}
                        className="text-xs text-fg-muted hover:text-fg underline underline-offset-2"
                      >
                        View
                      </Link>
                      {posthogProjectId && (
                        <a
                          href={`https://app.posthog.com/project/${posthogProjectId}/persons/${userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-fg-muted hover:text-fg"
                        >
                          PostHog →
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>
          Page {page} of {totalPages} · {totalPayingUsers} paying users
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              href={`/admin/paid-users?page=${page - 1}`}
              className="px-3 py-1 border rounded hover:bg-surface-elevated"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/admin/paid-users?page=${page + 1}`}
              className="px-3 py-1 border rounded hover:bg-surface-elevated"
            >
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
