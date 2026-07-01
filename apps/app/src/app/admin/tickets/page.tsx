import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { redirect } from "next/navigation"
import { TicketsTable } from "./TicketsTable"

export default async function AdminTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard")

  const admin = createAdminClient()
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, user_id, category, subject, body, status, created_at")
    .order("created_at", { ascending: false })

  const userIds = [...new Set((tickets ?? []).map((t) => t.user_id))]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const enriched = (tickets ?? []).map((t) => ({ ...t, user_email: emailMap[t.user_id] ?? null }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Tickets</h1>
        <span className="text-sm text-fg-muted">{enriched.length} total</span>
      </div>
      <TicketsTable initialTickets={enriched} />
    </div>
  )
}
