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

  // Resolve user emails
  const userIds = [...new Set((tickets ?? []).map((t) => t.user_id))]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const enriched = (tickets ?? []).map((t) => ({ ...t, user_email: emailMap[t.user_id] ?? null }))

  // Fetch thread messages for all tickets, chronological ascending
  const ticketIds = enriched.map((t) => t.id)
  const repliesByTicket: Record<string, { id: string; title: string; body: string; sender_role: "admin" | "user"; created_at: string }[]> = {}

  if (ticketIds.length > 0) {
    const { data: threadMessages } = await admin
      .from("messages")
      .select("id, ticket_id, title, body, sender_role, created_at")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true })

    for (const msg of (threadMessages ?? [])) {
      const tid = (msg as { ticket_id: string }).ticket_id
      if (!repliesByTicket[tid]) repliesByTicket[tid] = []
      repliesByTicket[tid].push({
        id:          msg.id,
        title:       msg.title,
        body:        msg.body,
        sender_role: msg.sender_role as "admin" | "user",
        created_at:  msg.created_at,
      })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Tickets</h1>
        <span className="text-sm text-fg-muted">{enriched.length} total</span>
      </div>
      <TicketsTable initialTickets={enriched} initialRepliesByTicket={repliesByTicket} />
    </div>
  )
}
