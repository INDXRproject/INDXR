import { createAdminClient } from "@/utils/supabase/admin"
import { PROCESSING_METHODS } from "@/types/transcript"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Count total users from auth.users — profiles table may be missing rows
  // for users created without triggering the profile trigger.
  // The SDK's TypeScript type doesn't expose `total`, so we fetch a large page and count.
  const { data: authUsersAll } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const totalUsers = authUsersAll?.users?.length ?? 0

  const [
    { count: totalTranscripts },
    { data: creditsPurchasedData },
    { data: creditsConsumedData },
    { data: activeUsers7dData },
    { data: recentTranscripts },
    { count: newUsers7d },
    { data: purchaseTransactions },
    { count: whisperCount },
    { data: allTranscriptUsers },
  ] = await Promise.all([
    admin.from("transcripts").select("*", { count: "exact", head: true }),
    admin.from("credit_transactions").select("amount").eq("type", "credit"),
    admin.from("credit_transactions").select("amount").eq("type", "debit"),
    // Fetch user_ids for distinct active user count
    admin
      .from("transcripts")
      .select("user_id")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("transcripts")
      .select("id, user_id, title, processing_method, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    // New users in last 7 days
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    // All credit purchases (for revenue + paying users)
    admin
      .from("credit_transactions")
      .select("user_id, metadata")
      .eq("type", "credit"),
    // Whisper transcript count — beide waarden: 'whisper_ai' (legacy frontend) en 'assemblyai' (backend)
    admin
      .from("transcripts")
      .select("*", { count: "exact", head: true })
      .in("processing_method", [PROCESSING_METHODS.WHISPER_LEGACY, PROCESSING_METHODS.ASSEMBLYAI]),
    // All transcript user_ids for top users calc
    admin.from("transcripts").select("user_id, credits_used, created_at"),
  ])

  // Distinct active users in last 7 days
  const activeUsers7d = new Set(activeUsers7dData?.map((r) => r.user_id)).size

  // --- Derived metrics ---
  const totalCreditsPurchased =
    creditsPurchasedData?.reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0
  const totalCreditsConsumed =
    creditsConsumedData?.reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0

  // Revenue: sum amount_paid from Stripe purchase metadata
  const revenue = (purchaseTransactions ?? []).reduce((sum, tx) => {
    const paid = parseFloat(tx.metadata?.amount_paid ?? "0") || 0
    return sum + paid
  }, 0)

  // Paying users: distinct user_ids with a Stripe purchase
  const payingUserIds = new Set(
    (purchaseTransactions ?? [])
      .filter((tx) => tx.metadata?.stripe_session_id)
      .map((tx) => tx.user_id)
  )
  const payingUsers = payingUserIds.size
  const conversionRate =
    totalUsers && totalUsers > 0
      ? ((payingUsers / totalUsers) * 100).toFixed(1)
      : "0.0"

  const whisperPct =
    totalTranscripts && totalTranscripts > 0 && whisperCount != null
      ? ((whisperCount / totalTranscripts) * 100).toFixed(1)
      : "0.0"

  // --- Top 10 users by transcript count ---
  const userTranscriptMap: Record<string, { count: number; creditsUsed: number; lastActive: string }> = {}
  for (const t of allTranscriptUsers ?? []) {
    if (!userTranscriptMap[t.user_id]) {
      userTranscriptMap[t.user_id] = { count: 0, creditsUsed: 0, lastActive: t.created_at }
    }
    userTranscriptMap[t.user_id].count++
    userTranscriptMap[t.user_id].creditsUsed += t.credits_used ?? 0
    if (t.created_at > userTranscriptMap[t.user_id].lastActive) {
      userTranscriptMap[t.user_id].lastActive = t.created_at
    }
  }

  const topUserIds = Object.entries(userTranscriptMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id]) => id)

  // Fetch emails for top users + recent transcripts in one pass
  const allUserIds = [...new Set([
    ...topUserIds,
    ...(recentTranscripts?.map((t) => t.user_id) ?? []),
  ])]

  const emailMap: Record<string, string> = {}
  await Promise.all(
    allUserIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Platform metrics and recent activity
        </p>
      </div>

      {/* Row 1 — Core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Users" value={totalUsers ?? 0} />
        <MetricCard label="Total Transcripts" value={totalTranscripts ?? 0} />
        <MetricCard
          label="Credits Purchased"
          value={totalCreditsPurchased.toLocaleString()}
        />
        <MetricCard
          label="Credits Consumed"
          value={totalCreditsConsumed.toLocaleString()}
        />
        <MetricCard label="Active (7d)" value={activeUsers7d ?? 0} />
      </div>

      {/* Row 2 — Business metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Revenue"
          value={`€${revenue.toFixed(2)}`}
          sub="from Stripe purchases"
        />
        <MetricCard
          label="New Users (7d)"
          value={newUsers7d ?? 0}
        />
        <MetricCard
          label="Paying Users"
          value={payingUsers}
          sub={`of ${totalUsers ?? 0} total`}
        />
        <MetricCard
          label="Conversion"
          value={`${conversionRate}%`}
          sub="free → paid"
        />
        <MetricCard
          label="Whisper Usage"
          value={`${whisperPct}%`}
          sub={`${whisperCount ?? 0} of ${totalTranscripts ?? 0}`}
        />
        <MetricCard
          label="Credits Balance"
          value={(totalCreditsPurchased - totalCreditsConsumed).toLocaleString()}
          sub="across all users"
        />
      </div>

      {/* Recent Transcripts */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Transcripts</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTranscripts?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transcripts yet
                  </TableCell>
                </TableRow>
              )}
              {recentTranscripts?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                    {emailMap[t.user_id] ?? t.user_id.slice(0, 8) + "…"}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {t.title ?? "Untitled"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {t.processing_method ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Top Users */}
      {topUserIds.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Top Users</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Transcripts</TableHead>
                  <TableHead>Credits Used</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUserIds.map((userId, i) => {
                  const stats = userTranscriptMap[userId]
                  return (
                    <TableRow key={userId}>
                      <TableCell className="text-xs text-muted-foreground w-8">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate">
                        {emailMap[userId] ?? userId.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {stats.count}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {stats.creditsUsed}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(stats.lastActive).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
