import { NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: tickets, error } = await admin
    .from("support_tickets")
    .select("id, user_id, category, subject, body, transcript_id, status, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve emails for unique user_ids
  const userIds = [...new Set((tickets ?? []).map((t) => t.user_id))]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const result = (tickets ?? []).map((t) => ({ ...t, user_email: emailMap[t.user_id] ?? null }))
  return NextResponse.json(result)
}
