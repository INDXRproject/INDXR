import { createAdminClient } from "@/utils/supabase/admin"
import { UsersTable } from "./UsersTable"

const PER_PAGE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const search = params.search?.toLowerCase() ?? ""

  const admin = createAdminClient()

  const { data: authData } = await admin.auth.admin.listUsers({
    page,
    perPage: PER_PAGE,
  })
  const authUsers = authData?.users ?? []

  const filtered = search
    ? authUsers.filter(
        (u) =>
          u.email?.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      )
    : authUsers

  const userIds = filtered.map((u) => u.id)

  const [profilesRes, creditsRes, purchasedRes] = await Promise.all([
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("id, username, role, suspended")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; username: string | null; role: string | null; suspended: boolean }[] }),
    userIds.length > 0
      ? admin.from("user_credits").select("user_id, credits").in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; credits: number }[] }),
    userIds.length > 0
      ? admin
          .from("credit_transactions")
          .select("user_id, amount")
          .eq("type", "credit")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; amount: number }[] }),
  ])

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  )
  const creditsMap = Object.fromEntries(
    (creditsRes.data ?? []).map((c) => [c.user_id, c.credits])
  )
  const purchasedMap: Record<string, number> = {}
  for (const tx of purchasedRes.data ?? []) {
    purchasedMap[tx.user_id] = (purchasedMap[tx.user_id] ?? 0) + tx.amount
  }

  const users = filtered.map((authUser) => {
    const profile = profileMap[authUser.id]
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      username: profile?.username ?? null,
      role: profile?.role ?? null,
      balance: creditsMap[authUser.id] ?? 0,
      purchased: purchasedMap[authUser.id] ?? 0,
      joined: authUser.created_at,
      lastActive: authUser.last_sign_in_at ?? null,
      suspended: profile?.suspended ?? false,
    }
  })

  const hasNext = authData?.users?.length === PER_PAGE
  const hasPrev = page > 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">All registered users</p>
        </div>
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search email or ID…"
            className="border rounded-md px-3 py-1.5 text-sm bg-background w-64"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm border rounded-md bg-background hover:bg-muted"
          >
            Search
          </button>
          {search && (
            <a
              href="/admin/users"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      <UsersTable users={users} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} · {filtered.length} users shown
        </span>
        <div className="flex gap-2">
          {hasPrev && (
            <a
              href={`/admin/users?page=${page - 1}${search ? `&search=${search}` : ""}`}
              className="px-3 py-1 border rounded hover:bg-muted"
            >
              ← Prev
            </a>
          )}
          {hasNext && (
            <a
              href={`/admin/users?page=${page + 1}${search ? `&search=${search}` : ""}`}
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
